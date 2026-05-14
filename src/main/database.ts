import path from 'node:path'
import { app } from 'electron'
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | null = null

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const dbPath = path.join(app.getPath('userData'), 'app.db')
    const dbUrl = `file:${dbPath}`
    process.env.DATABASE_URL = dbUrl

    prisma = new PrismaClient({
      datasources: {
        db: { url: dbUrl }
      }
    })
  }
  return prisma
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
