import bcrypt from "bcryptjs";
import {
  ExpenseCategory,
  PrismaClient,
  ProjectStatus,
  UserRole,
  WorkerRole,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const company = await prisma.company.upsert({
    where: { id: "seed-company-1" },
    update: {},
    create: {
      id: "seed-company-1",
      name: "Демо строителна фирма ООД",
    },
  });

  await prisma.user.upsert({
    where: { email: "super@demo.local" },
    update: {},
    create: {
      email: "super@demo.local",
      passwordHash,
      name: "Платформен админ",
      role: UserRole.SUPER_ADMIN,
      companyId: null,
    },
  });

  const boss = await prisma.user.upsert({
    where: { email: "boss@demo.local" },
    update: { companyId: company.id },
    create: {
      email: "boss@demo.local",
      passwordHash,
      name: "Demo Boss",
      role: UserRole.BOSS,
      companyId: company.id,
    },
  });

  const foremanUser = await prisma.user.upsert({
    where: { email: "foreman@demo.local" },
    update: { companyId: company.id },
    create: {
      email: "foreman@demo.local",
      passwordHash,
      name: "Demo Foreman",
      role: UserRole.FOREMAN,
      companyId: company.id,
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: { companyId: company.id },
    create: {
      id: "seed-project-1",
      companyId: company.id,
      name: "Sample build — Main St",
      location: "City",
      totalPrice: 125000,
      advancePayment: true,
      advanceAmount: 25000,
      status: ProjectStatus.ACTIVE,
    },
  });

  await prisma.projectForeman.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: foremanUser.id },
    },
    update: {},
    create: { projectId: project.id, userId: foremanUser.id },
  });

  const group = await prisma.workerGroup.upsert({
    where: { id: "seed-group-1" },
    update: {},
    create: {
      id: "seed-group-1",
      name: "Crew A",
      projectId: project.id,
    },
  });

  await prisma.worker.upsert({
    where: { id: "seed-worker-1" },
    update: {},
    create: {
      id: "seed-worker-1",
      name: "John Worker",
      role: WorkerRole.WORKER,
      groupId: group.id,
    },
  });

  await prisma.inventoryItem.upsert({
    where: { id: "seed-inv-1" },
    update: { companyId: company.id },
    create: {
      id: "seed-inv-1",
      companyId: company.id,
      name: "Cement",
      quantity: 100,
      unit: "kg",
      unitCostEur: 0.45,
    },
  });

  const existingExp = await prisma.expense.findFirst({
    where: { projectId: project.id, description: "Seed expense" },
  });
  if (!existingExp) {
    await prisma.expense.create({
      data: {
        company: { connect: { id: company.id } },
        project: { connect: { id: project.id } },
        amount: 500,
        date: new Date(),
        category: ExpenseCategory.MATERIALS,
        description: "Seed expense",
      },
    });
  }

  console.log(
    "Seed OK — super: super@demo.local | boss:",
    boss.email,
    "| foreman:",
    foremanUser.email,
    "| password: demo1234"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
