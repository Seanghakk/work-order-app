import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { sendTelegramMessage } from "@/lib/telegram";

// Call this daily (Vercel Cron) to alert Managers/Admins about maintenance contracts
// approaching their end date — once at 30 days out, again at 7 days out.
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000);
  const in7Days = new Date(now.getTime() + 7 * 86400000);

  const managers = await prisma.user.findMany({
    where: { role: { in: ["MANAGER", "ADMIN"] }, active: true },
    select: { id: true, email: true, telegramChatId: true },
  });

  async function alert(contract: any, daysLabel: string, field: "alert30SentAt" | "alert7SentAt") {
    const subject = `Contract expiring in ${daysLabel}: ${contract.clientName}`;
    const html = `<p>A ${contract.contractType === "DLP" ? "DLP (warranty)" : "maintenance"} contract for <strong>${contract.clientName}</strong> at ${contract.siteLocation} expires on ${contract.endDate.toLocaleDateString()} — that's ${daysLabel} from now.</p>`;
    const message = `Contract for ${contract.clientName} (${contract.siteLocation}) expires in ${daysLabel} — ${contract.endDate.toLocaleDateString()}`;
    for (const m of managers) {
      await sendEmail(m.email, subject, html);
      await notifyUser(m.id, message, "/maintenance-contracts");
      if (m.telegramChatId) await sendTelegramMessage(m.telegramChatId, message);
    }
    await prisma.maintenanceContract.update({ where: { id: contract.id }, data: { [field]: now } });
  }

  const due30 = await prisma.maintenanceContract.findMany({
    where: { status: "ACTIVE", alert30SentAt: null, endDate: { lte: in30Days, gt: in7Days } },
  });
  for (const c of due30) await alert(c, "30 days", "alert30SentAt");

  const due7 = await prisma.maintenanceContract.findMany({
    where: { status: "ACTIVE", alert7SentAt: null, endDate: { lte: in7Days } },
  });
  for (const c of due7) await alert(c, "7 days", "alert7SentAt");

  return NextResponse.json({ alerted30: due30.length, alerted7: due7.length });
}