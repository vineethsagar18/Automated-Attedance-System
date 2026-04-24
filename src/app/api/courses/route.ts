import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { conflict, fail, ok, unauthorized } from '@/lib/api-response'

const createSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(1),
  facultyId: z.string().min(1),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const courses = await prisma.course.findMany({
      include: {
        faculty: { select: { id: true, name: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { code: 'asc' },
    })
    return ok({ courses }, 'Courses fetched', 200, { courses })
  } catch {
    return fail('Failed to fetch courses', 500, 'SERVER_ERROR')
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Validation failed', 400, 'VALIDATION_ERROR')

    const existing = await prisma.course.findUnique({ where: { code: parsed.data.code } })
    if (existing) return conflict('Course code already exists')

    const course = await prisma.course.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        facultyId: parsed.data.facultyId,
      },
    })
    return ok({ course }, 'Course created', 201, { course })
  } catch {
    return fail('Failed to create course', 500, 'SERVER_ERROR')
  }
}
