import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { fail, ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId')
    const date = searchParams.get('date')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const studentName = searchParams.get('studentName')
    const studentEmail = searchParams.get('studentEmail')

    const where: Record<string, unknown> = {}

    if (courseId) where.courseId = courseId

    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : new Date('2000-01-01')
      from.setHours(0, 0, 0, 0)
      const to = toDate ? new Date(toDate) : new Date()
      to.setHours(23, 59, 59, 999)
      where.date = { gte: from, lte: to }
    } else if (date) {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      where.date = { gte: d, lt: next }
    }

    if (studentName || studentEmail) {
      where.student = {
        ...(studentName && { name: { contains: studentName } }),
        ...(studentEmail && { email: { contains: studentEmail } }),
      }
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            email: true,
            contactNo: true,
            address: true,
            state: true,
            country: true,
            profileImage: true,
          },
        },
        course: { select: { name: true, code: true } },
      },
      orderBy: { date: 'desc' },
    })

    return ok({ records }, 'Attendance records fetched', 200, { records })
  } catch {
    return fail('Failed to fetch attendance records', 500, 'SERVER_ERROR')
  }
}
