import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { conflict, fail, ok, unauthorized } from '@/lib/api-response'

const createSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  rollNo: z.string().min(1, 'Roll number is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  gender: z.string().optional(),
  contactNo: z
    .string()
    .regex(/^\d{10}$/, 'Contact must be exactly 10 digits')
    .optional()
    .or(z.literal('')),
  address: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  profileImage: z.string().optional(), // base64 data URL
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId')
    const email = searchParams.get('email')

    if (email) {
      const student = await prisma.student.findUnique({ where: { email } })
      if (!student) return fail('Email not found', 404, 'NOT_FOUND')
      return ok({ student }, 'Student fetched', 200, { student })
    }

    if (courseId) {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        include: { student: true },
        orderBy: { student: { rollNo: 'asc' } },
      })
      const students = enrollments.map((e) => e.student)
      return ok({ students }, 'Students fetched', 200, { students })
    }

    const students = await prisma.student.findMany({ orderBy: { rollNo: 'asc' } })
    return ok({ students }, 'Students fetched', 200, { students })
  } catch {
    return fail('Failed to fetch students', 500, 'SERVER_ERROR')
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Validation failed', 400, 'VALIDATION_ERROR')

    if (parsed.data.email) {
      const existing = await prisma.student.findUnique({ where: { email: parsed.data.email } })
      if (existing) {
        return conflict('Duplicate Email ID - this email is already registered')
      }
    }

    const student = await prisma.student.create({
      data: {
        name: parsed.data.name,
        rollNo: parsed.data.rollNo,
        email: parsed.data.email || null,
        gender: parsed.data.gender || null,
        contactNo: parsed.data.contactNo || null,
        address: parsed.data.address || null,
        state: parsed.data.state || null,
        country: parsed.data.country || null,
        profileImage: parsed.data.profileImage || null,
      },
    })
    return ok({ student }, 'Student created', 201, { student })
  } catch {
    return fail('Failed to create student', 500, 'SERVER_ERROR')
  }
}
