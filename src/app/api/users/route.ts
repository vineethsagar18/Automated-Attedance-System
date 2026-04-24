import { ok, unauthorized, fail } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const users = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'FACULTY'] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })

    return ok({ users }, 'Users fetched', 200, { users })
  } catch {
    return fail('Failed to fetch users', 500, 'SERVER_ERROR')
  }
}
