import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { fail, ok, unauthorized } from '@/lib/api-response'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  gender: z.string().optional(),
  contactNo: z.string().regex(/^\d{10}$/, 'Contact must be exactly 10 digits').optional().or(z.literal('')),
  address: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  profileImage: z.string().optional(), // base64 data URL
})

// Next.js 16 — params is a Promise
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { id } = await params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Validation failed', 400, 'VALIDATION_ERROR')

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...(parsed.data.name && { name: parsed.data.name }),
        email: parsed.data.email || null,
        gender: parsed.data.gender || null,
        contactNo: parsed.data.contactNo || null,
        address: parsed.data.address || null,
        state: parsed.data.state || null,
        country: parsed.data.country || null,
        profileImage: parsed.data.profileImage || null,
      },
    })

    return ok({ student }, 'Student updated', 200, { student })
  } catch {
    return fail('Failed to update student', 500, 'SERVER_ERROR')
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { id } = await params
    await prisma.student.delete({ where: { id } })
    return ok({ success: true }, 'Student deleted', 200, { success: true })
  } catch {
    return fail('Failed to delete student', 500, 'SERVER_ERROR')
  }
}
