import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pass = await bcrypt.hash("changeme123", 10);

  // Note: your live database already ran the multi-site migration, which created a
  // "Main Site" and assigned every existing user to it automatically. This seed script
  // adds a second example site so you can actually test multi-site behavior — a
  // Technician assigned only to Site A shouldn't see Site B's work orders, for example.
  const mainSite = await prisma.site.upsert({
    where: { name: "Main Site" },
    update: {},
    create: { name: "Main Site" },
  });
  const secondSite = await prisma.site.upsert({
    where: { name: "Siem Reap Branch" },
    update: {},
    create: { name: "Siem Reap Branch", address: "Siem Reap, Cambodia" },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: { name: "Dana Manager", email: "manager@example.com", passwordHash: pass, role: Role.MANAGER },
  });
  const tech = await prisma.user.upsert({
    where: { email: "tech@example.com" },
    update: {},
    create: { name: "Alex Technician", email: "tech@example.com", passwordHash: pass, role: Role.MAINTENANCE_TECHNICIAN },
  });
  const requester = await prisma.user.upsert({
    where: { email: "requester@example.com" },
    update: {},
    create: { name: "Sam Requester", email: "requester@example.com", passwordHash: pass, role: Role.REQUESTER },
  });

  // Assign the manager to both sites (so they can see everything), and the technician
  // and requester to just Main Site — a realistic single-site staff setup.
  for (const [userId, siteId] of [
    [manager.id, mainSite.id],
    [manager.id, secondSite.id],
    [tech.id, mainSite.id],
    [requester.id, mainSite.id],
  ]) {
    await prisma.userSite.upsert({
      where: { userId_siteId: { userId, siteId } },
      update: {},
      create: { userId, siteId },
    });
  }

  const ahu = await prisma.asset.upsert({
    where: { tag: "AHU-01" },
    update: {},
    create: { name: "Air handling unit 1", tag: "AHU-01", location: "Roof - east wing", category: "HVAC", siteId: mainSite.id },
  });

  await prisma.pMSchedule.upsert({
    where: { id: "seed-pm-1" },
    update: {},
    create: {
      id: "seed-pm-1",
      name: "AHU-01 filter change",
      assetId: ahu.id,
      frequencyDays: 90,
      taskTemplate: "Replace filters and inspect belts on AHU-01.",
      nextDueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  await prisma.workOrder.upsert({
    where: { id: "seed-wo-1" },
    update: {},
    create: {
      id: "seed-wo-1",
      title: "AHU-01 not reaching setpoint",
      description: "Discharge air temp reading 4 degrees above setpoint during occupied hours.",
      priority: "HIGH",
      assetId: ahu.id,
      siteId: mainSite.id,
      requestedById: requester.id,
      assignedToId: tech.id,
      status: "ASSIGNED",
    },
  });

  console.log("Seeded users (password: changeme123):", manager.email, tech.email, requester.email);
  console.log("Seeded sites:", mainSite.name, "(everyone) and", secondSite.name, "(manager only, for testing site restriction)");
}

main().finally(() => prisma.$disconnect());
