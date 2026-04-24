import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { fail, ok, unauthorized } from '@/lib/api-response'

// Next.js 16 — params is a Promise
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { id } = await params

    await prisma.course.delete({ where: { id } })
    return ok({ success: true }, 'Course deleted', 200, { success: true })
  } catch {
    return fail('Failed to delete course', 500, 'SERVER_ERROR')
  }
}
