import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { fail, ok, unauthorized } from '@/lib/api-response'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { id } = await params

    await prisma.attendanceSession.update({
      where: { id },
      data: { isActive: false },
    })

    return ok({ id }, 'Attendance session closed')
  } catch {
    return fail('Failed to close attendance session', 500, 'SERVER_ERROR')
  }
}
