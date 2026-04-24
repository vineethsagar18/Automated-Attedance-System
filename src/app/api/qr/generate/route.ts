import { NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { fail, ok, unauthorized } from '@/lib/api-response'

// GET — generate QR for ALL students
export async function GET() {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const students = await prisma.student.findMany({ orderBy: { rollNo: 'asc' } })

    const results = await Promise.all(
      students.map(async (student) => {
        const payload = JSON.stringify({ studentId: student.id, rollNo: student.rollNo })
        const qrBase64 = await QRCode.toDataURL(payload, {
          width: 250,
          margin: 2,
          color: { dark: '#2C2C2C', light: '#F3F4F4' },
        })
        await prisma.student.update({
          where: { id: student.id },
          data: { qrCode: qrBase64 },
        })
        return { ...student, qrCode: qrBase64 }
      })
    )

    return ok({ students: results }, 'QR codes generated', 200, { students: results })
  } catch {
    return fail('Failed to generate QR codes', 500, 'SERVER_ERROR')
  }
}

// POST — generate QR for a single student
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const { studentId } = await req.json()

    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) return fail('Student not found', 404, 'NOT_FOUND')

    const payload = JSON.stringify({ studentId: student.id, rollNo: student.rollNo })
    const qrBase64 = await QRCode.toDataURL(payload, {
      width: 300,
      margin: 2,
      color: { dark: '#2C2C2C', light: '#F3F4F4' },
    })

    await prisma.student.update({
      where: { id: studentId },
      data: { qrCode: qrBase64 },
    })

    return ok({ qrCode: qrBase64, studentName: student.name }, 'QR generated', 200, { qrCode: qrBase64, studentName: student.name })
  } catch {
    return fail('Failed to generate student QR code', 500, 'SERVER_ERROR')
  }
}
