import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pass = await bcrypt.hash("changeme123", 10);

  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: { name: "Dana Manager", email: "manager@example.com", passwordHash: pass, role: Role.MANAGER },
  });
  const tech = await prisma.user.upsert({
    where: { email: "tech@example.com" },
    update: {},
    create: { name: "Alex Technician", email: "tech@example.com", passwordHash: pass, role: Role.TECHNICIAN },
  });
  const requester = await prisma.user.upsert({
    where: { email: "requester@example.com" },
    update: {},
    create: { name: "Sam Requester", email: "requester@example.com", passwordHash: pass, role: Role.REQUESTER },
  });

  const ahu = await prisma.asset.upsert({
    where: { tag: "AHU-01" },
    update: {},
    create: { name: "Air handling unit 1", tag: "AHU-01", location: "Roof - east wing", category: "HVAC" },
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

  await prisma.workOrder.create({
    data: {
      title: "AHU-01 not reaching setpoint",
      description: "Discharge air temp reading 4 degrees above setpoint during occupied hours.",
      priority: "HIGH",
      assetId: ahu.id,
      requestedById: requester.id,
      assignedToId: tech.id,
      status: "ASSIGNED",
    },
  });

  console.log("Seeded users (password: changeme123):", manager.email, tech.email, requester.email);
}

main().finally(() => prisma.$disconnect());
