import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, workOrderEscalatedEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { sendTelegramMessage } from "@/lib/telegram";
import { checkSiteAccess } from "@/lib/permissions";

const APP_URL = process.env.NEXTAUTH_URL || "";

// Escalation thresholds (hours elapsed since pendingApprovalSince) per priority — on
// first breach, escalate; after that, re-notify every REPEAT_HOURS until the work
// order leaves PENDING_APPROVAL. Run hourly via Vercel Cron (vercel.json) — frequent
// enough to catch the 4-hour Urgent threshold with reasonable precision.
const THRESHOLD_HOURS: Record<string, number> = { URGENT: 4, HIGH: 12, MEDIUM: 24, LOW: 48 };
const REPEAT_HOURS = 4;
const HOUR_MS = 3600000;

function joinNames(names: string[]): string {
  if (names.length === 0) return "no one (no leader, backup approver, or manager found)";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Attributed author for the automatic Comment log entry — same "first MANAGER
  // found" convention /api/pm-schedules/generate already uses for cron-created rows.
  const [systemActor, candidateManagers] = await Promise.all([
    prisma.user.findFirst({ where: { role: "MANAGER" } }),
    prisma.user.findMany({ where: { role: { in: ["MANAGER", "ADMIN"] }, active: true } }),
  ]);

  const pending = await prisma.workOrder.findMany({
    where: { status: "PENDING_APPROVAL", pendingApprovalSince: { not: null } },
    include: { site: true, team: { include: { teamLeader: true, backupApprover: true } } },
  });

  let escalatedCount = 0;

  for (const wo of pending) {
    const thresholdHours = THRESHOLD_HOURS[wo.priority];
    const elapsedHours = (now.getTime() - wo.pendingApprovalSince!.getTime()) / HOUR_MS;
    if (elapsedHours < thresholdHours) continue;

    if (wo.lastEscalatedAt) {
      const sinceLastHours = (now.getTime() - wo.lastEscalatedAt.getTime()) / HOUR_MS;
      if (sinceLastHours < REPEAT_HOURS) continue;
    }

    // Recipients: team leader + (backup approver, or Manager/Admin for the work
    // order's site if no backup approver is assigned) — deduplicated by id.
    const recipients = new Map<string, { id: string; name: string; email: string; telegramChatId: string | null }>();
    if (wo.team?.teamLeader?.active) recipients.set(wo.team.teamLeader.id, wo.team.teamLeader);
    if (wo.team?.backupApprover?.active) {
      recipients.set(wo.team.backupApprover.id, wo.team.backupApprover);
    } else {
      for (const m of candidateManagers) {
        if (m.role === "ADMIN" || (await checkSiteAccess(m.id, m.role, wo.siteId))) {
          recipients.set(m.id, m);
        }
      }
    }

    const elapsedHoursRounded = Math.round(elapsedHours);
    const { subject, html } = workOrderEscalatedEmail(wo.title, wo.priority, elapsedHoursRounded, wo.id);
    // In-app notification stays short (surfaced inline in the notification panel).
    const message = `"${wo.title}" has been pending approval for ${elapsedHoursRounded}h (${wo.priority} priority) — needs your review.`;
    // Telegram is the primary/trusted channel, so it gets its own, more complete
    // message — site name plus a direct link — rather than reusing the shorter
    // in-app string.
    const telegramMessage = `"${wo.title}" at ${wo.site?.name || "—"} has been pending approval for ${elapsedHoursRounded}h (${wo.priority} priority) — needs your review. ${APP_URL}/work-orders/${wo.id}`;

    for (const r of recipients.values()) {
      await notifyUser(r.id, message, `/work-orders/${wo.id}`);
      await sendEmail(r.email, subject, html);
      if (r.telegramChatId) await sendTelegramMessage(r.telegramChatId, telegramMessage);
    }

    if (systemActor) {
      await prisma.comment.create({
        data: {
          workOrderId: wo.id,
          authorId: systemActor.id,
          body: `Escalated: pending approval for ${elapsedHoursRounded}h, notified ${joinNames([...recipients.values()].map((r) => r.name))}.`,
        },
      });
    } else {
      console.error("Escalation: no MANAGER user found to attribute the audit-trail comment to — notifications still sent.");
    }

    await prisma.workOrder.update({ where: { id: wo.id }, data: { lastEscalatedAt: now } });
    escalatedCount++;
  }

  return NextResponse.json({ scanned: pending.length, escalatedCount });
}
