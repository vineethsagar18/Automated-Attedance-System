import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
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
      student: true,
      course: true,
      markedBy: { select: { name: true, email: true } },
    },
    orderBy: { date: 'desc' },
  })

  const header = 'Roll No,Name,Email,Course Code,Course Name,Date,Check-In,Check-Out,Work Minutes,Status,Method,Marked By'
  const rows = records.map((r) =>
    [
      r.student.rollNo,
      `"${r.student.name}"`,
      r.student.email ?? '',
      r.course.code,
      `"${r.course.name}"`,
      new Date(r.date).toLocaleDateString('en-IN'),
      new Date(r.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      r.checkOutTime
        ? new Date(r.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '',
      r.workMinutes ?? '',
      r.status,
      r.method,
      `"${r.markedBy.name}"`,
    ].join(',')
  )
  const csv = [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="attendance_${date ?? 'all'}.csv"`,
    },
  })
}
