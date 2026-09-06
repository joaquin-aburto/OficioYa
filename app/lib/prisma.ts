import { PrismaClient } from '../../generated/prisma';

const globalForPrisma = global as unknown as { prisma: PrismaClient };


import { PrismaPg } from '@prisma/adapter-pg';

// Usa la URL de conexión que Neon te da (en tu dashboard)
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL, 
});

const prisma = new PrismaClient({ adapter });

export default prisma;