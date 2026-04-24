import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { fail, ok, unauthorized } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { courseId, presentStudentIds } = await req.json()

    if (!courseId) return fail('courseId required', 400, 'VALIDATION_ERROR')

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      select: { studentId: true },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.attendance.deleteMany({
      where: { courseId, date: { gte: today }, method: 'MANUAL' },
    })

    await prisma.attendance.createMany({
      data: enrollments.map(({ studentId }) => ({
        studentId,
        courseId,
        markedById: session.user.id,
        status: (presentStudentIds as string[]).includes(studentId) ? 'PRESENT' : 'ABSENT',
        method: 'MANUAL',
      })),
    })

    return ok({ success: true }, 'Manual attendance saved', 200, { success: true })
  } catch {
    return fail('Failed to save manual attendance', 500, 'SERVER_ERROR')
  }
}
