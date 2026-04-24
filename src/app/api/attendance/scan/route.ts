import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { fail, ok, unauthorized } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { studentId, courseId, token } = await req.json()

    if (!studentId || !courseId || !token) {
      return fail('studentId, courseId and token are required', 400, 'VALIDATION_ERROR')
    }

    const now = new Date()
    await prisma.attendanceSession.updateMany({
      where: { isActive: true, expiresAt: { lte: now } },
      data: { isActive: false },
    })

    const attendanceSession = await prisma.attendanceSession.findFirst({
      where: {
        token,
        courseId,
        isActive: true,
        expiresAt: { gt: now },
      },
      select: { id: true },
    })

    if (!attendanceSession) {
      return fail('Invalid or expired attendance session', 401, 'SESSION_EXPIRED')
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) {
      return fail('This QR code belongs to a user who is not registered in the system.', 404, 'NOT_FOUND')
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existing = await prisma.attendance.findFirst({
      where: { studentId, courseId, date: { gte: today, lt: tomorrow } },
    })

    if (!existing) {
      await prisma.attendance.create({
        data: {
          studentId,
          courseId,
          markedById: session.user.id,
          sessionId: attendanceSession.id,
          status: 'PRESENT',
          method: 'QR_SCAN',
        },
      })
      return ok({
        type: 'CHECK_IN',
        message: `Check-In recorded for ${student.name}`,
        student,
        checkedIn: true,
        checkedOut: false,
      })
    }

    if (!existing.checkOutTime) {
      const checkInTime = new Date(existing.date)
      const diffMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000)

      if (diffMinutes < 5) {
        const remaining = 5 - diffMinutes
        return ok({
          type: 'TOO_EARLY',
          message: `${student.name} must wait ${remaining} more minute(s) before checking out.`,
          student,
          checkedIn: true,
          checkedOut: false,
        })
      }

      const workMinutes = diffMinutes
      await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime: now,
          workMinutes,
          sessionId: existing.sessionId ?? attendanceSession.id,
        },
      })

      const hours = Math.floor(workMinutes / 60)
      const mins = workMinutes % 60
      const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

      return ok({
        type: 'CHECK_OUT',
        message: `Check-Out recorded for ${student.name} - Work duration: ${duration}`,
        student,
        checkedIn: true,
        checkedOut: true,
        workMinutes,
      })
    }

    return ok({
      type: 'ALREADY_DONE',
      message: `${student.name} has already completed check-in and check-out for today.`,
      student,
      checkedIn: true,
      checkedOut: true,
    })
  } catch {
    return fail('Failed to process QR scan', 500, 'SERVER_ERROR')
  }
}
