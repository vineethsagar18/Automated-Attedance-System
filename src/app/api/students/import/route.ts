import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { fail, ok, unauthorized } from '@/lib/api-response'

type Row = {
  name: string
  rollNo: string
  email?: string
  gender?: string
  contactNo?: string
  address?: string
  state?: string
  country?: string
}

function parseCsvLine(line: string) {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  result.push(current.trim())
  return result
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return unauthorized()

    const body = await req.json()
    const csvText = typeof body.csvText === 'string' ? body.csvText : ''

    if (!csvText.trim()) return fail('csvText is required', 400, 'VALIDATION_ERROR')

    const lines = csvText
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter(Boolean)

    if (lines.length < 2) {
      return fail('CSV must include header and at least one row', 400, 'VALIDATION_ERROR')
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
    const index = (key: string) => headers.indexOf(key)

    const nameIdx = index('name')
    const rollIdx = index('rollno')
    if (nameIdx < 0 || rollIdx < 0) {
      return fail('CSV header must include name and rollNo columns', 400, 'VALIDATION_ERROR')
    }

    const rows: Row[] = lines.slice(1).map((line: string) => {
      const cols = parseCsvLine(line)
      return {
        name: cols[nameIdx] ?? '',
        rollNo: cols[rollIdx] ?? '',
        email: index('email') >= 0 ? cols[index('email')] : '',
        gender: index('gender') >= 0 ? cols[index('gender')] : '',
        contactNo: index('contactno') >= 0 ? cols[index('contactno')] : '',
        address: index('address') >= 0 ? cols[index('address')] : '',
        state: index('state') >= 0 ? cols[index('state')] : '',
        country: index('country') >= 0 ? cols[index('country')] : '',
      }
    })

    const cleaned = rows.filter((row) => row.name && row.rollNo)

    let created = 0
    let skipped = 0

    for (const row of cleaned) {
      try {
        const existing = await prisma.student.findFirst({
          where: {
            OR: [
              { rollNo: row.rollNo },
              ...(row.email ? [{ email: row.email }] : []),
            ],
          },
          select: { id: true },
        })

        if (existing) {
          skipped += 1
          continue
        }

        await prisma.student.create({
          data: {
            name: row.name,
            rollNo: row.rollNo,
            email: row.email || null,
            gender: row.gender || null,
            contactNo: row.contactNo || null,
            address: row.address || null,
            state: row.state || null,
            country: row.country || null,
          },
        })
        created += 1
      } catch {
        skipped += 1
      }
    }

    return ok({ created, skipped, totalRows: cleaned.length }, 'Batch import completed')
  } catch {
    return fail('Failed to import students', 500, 'SERVER_ERROR')
  }
}
