import { prisma } from '@/lib/prisma'
import { ok, fail } from '@/lib/api-response'

export async function GET() {
  try {
    // Quick DB connectivity check
    await prisma.$runCommandRaw({ ping: 1 })

    return ok({
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dbConnected: true,
    }, 'Service healthy')
  } catch {
    return fail('Database connection failed', 503, 'DB_ERROR')
  }
}
