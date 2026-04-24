import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { fail, ok, unauthorized } from '@/lib/api-response'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { id: courseId } = await params

    const [course, enrollments, allStudents] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, name: true, code: true },
      }),
      prisma.enrollment.findMany({
        where: { courseId },
        include: { student: true },
        orderBy: { student: { rollNo: 'asc' } },
      }),
      prisma.student.findMany({ orderBy: { rollNo: 'asc' } }),
    ])

    if (!course) return fail('Course not found', 404, 'NOT_FOUND')

    const enrolledStudentIds = enrollments.map((e) => e.studentId)

    return ok(
      {
        course,
        enrolledStudents: enrollments.map((e) => e.student),
        allStudents,
        enrolledStudentIds,
      },
      'Course enrollments fetched',
      200,
      {
        course,
        enrolledStudents: enrollments.map((e) => e.student),
        allStudents,
        enrolledStudentIds,
      }
    )
  } catch {
    return fail('Failed to fetch enrollments', 500, 'SERVER_ERROR')
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { id: courseId } = await params
    const body = await req.json()
    const studentIds = Array.isArray(body.studentIds)
      ? body.studentIds.filter((id: unknown): id is string => typeof id === 'string')
      : []

    await prisma.$transaction([
      prisma.enrollment.deleteMany({ where: { courseId } }),
      ...(studentIds.length > 0
        ? [
            prisma.enrollment.createMany({
              data: studentIds.map((studentId: string) => ({ studentId, courseId })),
            }),
          ]
        : []),
    ])

    return ok({ courseId, studentIds }, 'Enrollments updated')
  } catch {
    return fail('Failed to update enrollments', 500, 'SERVER_ERROR')
  }
}
