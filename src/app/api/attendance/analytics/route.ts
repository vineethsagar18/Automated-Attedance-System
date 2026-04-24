import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { fail, ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { searchParams } = new URL(req.url)
    const daysRaw = Number(searchParams.get('days') ?? 7)
    const days = Number.isFinite(daysRaw) ? Math.max(3, Math.min(30, Math.floor(daysRaw))) : 7

    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(now.getDate() - (days - 1))
    startDate.setHours(0, 0, 0, 0)

    const records = await prisma.attendance.findMany({
      where: { date: { gte: startDate } },
      select: {
        status: true,
        date: true,
        courseId: true,
        course: { select: { code: true, name: true } },
      },
      orderBy: { date: 'asc' },
    })

    const trend: { date: string; present: number; absent: number; late: number; total: number }[] = []
    for (let i = 0; i < days; i += 1) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const dateKey = d.toISOString().slice(0, 10)
      trend.push({ date: dateKey, present: 0, absent: 0, late: 0, total: 0 })
    }

    const trendMap = new Map(trend.map((item) => [item.date, item]))
    const courseMap = new Map<string, { courseId: string; code: string; name: string; total: number; present: number }>()

    for (const item of records) {
      const key = new Date(item.date).toISOString().slice(0, 10)
      const day = trendMap.get(key)
      if (day) {
        day.total += 1
        if (item.status === 'PRESENT') day.present += 1
        if (item.status === 'ABSENT') day.absent += 1
        if (item.status === 'LATE') day.late += 1
      }

      const existing = courseMap.get(item.courseId) ?? {
        courseId: item.courseId,
        code: item.course.code,
        name: item.course.name,
        total: 0,
        present: 0,
      }
      existing.total += 1
      if (item.status === 'PRESENT') existing.present += 1
      courseMap.set(item.courseId, existing)
    }

    const topCourses = [...courseMap.values()]
      .map((c) => ({
        ...c,
        attendanceRate: c.total > 0 ? Math.round((c.present / c.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)

    const totalPresent = records.filter((r) => r.status === 'PRESENT').length
    const totalRecords = records.length

    return ok(
      {
        days,
        summary: {
          totalRecords,
          totalPresent,
          attendanceRate: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0,
        },
        trend,
        topCourses,
      },
      'Attendance analytics fetched'
    )
  } catch {
    return fail('Failed to fetch analytics', 500, 'SERVER_ERROR')
  }
}
