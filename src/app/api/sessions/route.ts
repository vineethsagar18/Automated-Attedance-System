import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { fail, ok, unauthorized } from '@/lib/api-response'

const DEFAULT_SESSION_MINUTES = 45

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) return fail('courseId is required', 400, 'VALIDATION_ERROR')

    const now = new Date()

    await prisma.attendanceSession.updateMany({
      where: { courseId, isActive: true, expiresAt: { lte: now } },
      data: { isActive: false },
    })

    const activeSession = await prisma.attendanceSession.findFirst({
      where: { courseId, isActive: true, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return ok({ activeSession }, 'Attendance session fetched')
  } catch {
    return fail('Failed to fetch attendance session', 500, 'SERVER_ERROR')
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const body = await req.json()
    const courseId = typeof body.courseId === 'string' ? body.courseId : ''
    const minutesRaw = Number(body.expiresInMinutes)
    const expiresInMinutes = Number.isFinite(minutesRaw)
      ? Math.max(5, Math.min(180, Math.floor(minutesRaw)))
      : DEFAULT_SESSION_MINUTES

    if (!courseId) return fail('courseId is required', 400, 'VALIDATION_ERROR')

    const now = new Date()

    await prisma.attendanceSession.updateMany({
      where: { courseId, isActive: true },
      data: { isActive: false },
    })

    const created = await prisma.attendanceSession.create({
      data: {
        courseId,
        createdById: session.user.id,
        expiresAt: new Date(now.getTime() + expiresInMinutes * 60 * 1000),
      },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return ok({ session: created }, 'Attendance session started', 201)
  } catch {
    return fail('Failed to start attendance session', 500, 'SERVER_ERROR')
  }
}
