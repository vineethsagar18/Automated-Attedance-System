# Skill: QR Code System

## When to use this skill
Generating QR codes for students, scanning QR codes via webcam, validating scans.

---

## 1. Install
```bash
npm install qrcode html5-qrcode
npm install -D @types/qrcode
```

---

## 2. QR Generation API — src/app/api/qr/generate/route.ts
Each student gets a QR code that encodes their unique ID.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Generate QR for a single student
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { studentId } = await req.json()

  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // QR payload: just the student ID (we verify it server-side)
  const qrPayload = JSON.stringify({ studentId: student.id, rollNo: student.rollNo })

  // Generate as base64 PNG
  const qrBase64 = await QRCode.toDataURL(qrPayload, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })

  // Save to student record
  await prisma.student.update({
    where: { id: studentId },
    data: { qrCode: qrBase64 },
  })

  return NextResponse.json({ qrCode: qrBase64, studentName: student.name })
}

// Generate QR for ALL students in bulk
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const students = await prisma.student.findMany()

  const results = await Promise.all(
    students.map(async (student) => {
      const qrPayload = JSON.stringify({ studentId: student.id, rollNo: student.rollNo })
      const qrBase64 = await QRCode.toDataURL(qrPayload, { width: 200, margin: 1 })
      await prisma.student.update({ where: { id: student.id }, data: { qrCode: qrBase64 } })
      return { ...student, qrCode: qrBase64 }
    })
  )

  return NextResponse.json({ students: results })
}
```

---

## 3. QR Generate Page — src/app/qr/generate/page.tsx
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StudentQR {
  id: string
  name: string
  rollNo: string
  qrCode: string
}

export default function QRGeneratePage() {
  const [students, setStudents] = useState<StudentQR[]>([])
  const [loading, setLoading] = useState(false)

  async function generateAll() {
    setLoading(true)
    const res = await fetch('/api/qr/generate')
    const data = await res.json()
    setStudents(data.students)
    setLoading(false)
  }

  function downloadQR(student: StudentQR) {
    const a = document.createElement('a')
    a.href = student.qrCode
    a.download = `QR_${student.rollNo}_${student.name}.png`
    a.click()
  }

  function printAll() {
    window.print()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">QR Code Generator</h1>
        <div className="flex gap-2">
          <Button onClick={generateAll} disabled={loading}>
            {loading ? 'Generating...' : 'Generate All QR Codes'}
          </Button>
          {students.length > 0 && (
            <Button variant="outline" onClick={printAll}>
              Print All
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3">
        {students.map((student) => (
          <Card key={student.id} className="text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{student.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{student.rollNo}</p>
            </CardHeader>
            <CardContent>
              <img src={student.qrCode} alt={student.name} className="mx-auto w-32 h-32" />
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full print:hidden"
                onClick={() => downloadQR(student)}
              >
                Download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

---

## 4. QR Scanner Component — src/components/QRScanner.tsx
```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '@/components/ui/button'

interface QRScannerProps {
  onScan: (studentId: string, rollNo: string) => void
}

export function QRScanner({ onScan }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [lastScan, setLastScan] = useState('')

  function startScanner() {
    setIsActive(true)
    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    )
    scannerRef.current.render(
      (decodedText) => {
        // Prevent duplicate scans within 2 seconds
        if (decodedText === lastScan) return
        setLastScan(decodedText)
        setTimeout(() => setLastScan(''), 2000)

        try {
          const payload = JSON.parse(decodedText)
          if (payload.studentId) {
            onScan(payload.studentId, payload.rollNo)
          }
        } catch {
          console.error('Invalid QR code')
        }
      },
      (error) => {
        // Scan errors are normal — ignore
      }
    )
  }

  function stopScanner() {
    scannerRef.current?.clear()
    setIsActive(false)
  }

  useEffect(() => {
    return () => { scannerRef.current?.clear() }
  }, [])

  return (
    <div className="space-y-4">
      {!isActive ? (
        <Button onClick={startScanner} className="w-full">
          📷 Start QR Scanner
        </Button>
      ) : (
        <Button variant="destructive" onClick={stopScanner} className="w-full">
          Stop Scanner
        </Button>
      )}
      <div id="qr-reader" className="w-full max-w-sm mx-auto" />
    </div>
  )
}
```

---

## 5. QR Scan API — src/app/api/attendance/scan/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { studentId, courseId } = await req.json()

  // Verify student exists
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Check if already marked today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const existing = await prisma.attendance.findFirst({
    where: { studentId, courseId, date: { gte: today, lt: tomorrow } }
  })

  if (existing) {
    return NextResponse.json({ 
      message: `${student.name} already marked present today`,
      alreadyMarked: true,
      student
    })
  }

  // Mark attendance
  await prisma.attendance.create({
    data: {
      studentId,
      courseId,
      markedById: session.user.id,
      status: 'PRESENT',
      method: 'QR_SCAN',
    }
  })

  return NextResponse.json({ 
    message: `✅ ${student.name} marked present`,
    student
  })
}
```

---

## 6. Important: html5-qrcode needs dynamic import
Add to `next.config.ts` to avoid SSR errors:
```typescript
const nextConfig = {
  experimental: {
    // html5-qrcode uses browser APIs
  },
}
```

In any page that uses QRScanner, import it dynamically:
```typescript
import dynamic from 'next/dynamic'
const QRScanner = dynamic(
  () => import('@/components/QRScanner').then(m => m.QRScanner),
  { ssr: false }
)
```