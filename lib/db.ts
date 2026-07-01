import { PrismaClient } from "@prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaMssql(process.env.DATABASE_URL!);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });
  

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
