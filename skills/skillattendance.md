# Skill: Attendance (Mark, View, Export)

## When to use this skill
Building the attendance marking page, attendance view/filter table, and CSV export.

---

## 1. Mark Attendance Page — src/app/attendance/mark/page.tsx
Combines QR scanning + manual checkbox marking.

```typescript
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

const QRScanner = dynamic(
  () => import('@/components/QRScanner').then(m => m.QRScanner),
  { ssr: false }
)

interface Course { id: string; name: string; code: string }
interface Student { id: string; name: string; rollNo: string; present: boolean }

export default function MarkAttendancePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [scanLog, setScanLog] = useState<string[]>([])
  const [mode, setMode] = useState<'qr' | 'manual'>('qr')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(d => setCourses(d.courses))
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    fetch(`/api/students?courseId=${selectedCourse}`)
      .then(r => r.json())
      .then(d => setStudents(d.students.map((s: any) => ({ ...s, present: false }))))
  }, [selectedCourse])

  async function handleQRScan(studentId: string) {
    if (!selectedCourse) {
      alert('Please select a course first')
      return
    }
    const res = await fetch('/api/attendance/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, courseId: selectedCourse }),
    })
    const data = await res.json()
    setScanLog(prev => [data.message, ...prev.slice(0, 9)])
    setStudents(prev =>
      prev.map(s => s.id === studentId ? { ...s, present: true } : s)
    )
  }

  function toggleStudent(studentId: string) {
    setStudents(prev =>
      prev.map(s => s.id === studentId ? { ...s, present: !s.present } : s)
    )
  }

  async function saveManualAttendance() {
    setSaving(true)
    const presentIds = students.filter(s => s.present).map(s => s.id)
    await fetch('/api/attendance/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: selectedCourse, presentStudentIds: presentIds }),
    })
    setSaving(false)
    alert('Attendance saved!')
  }

  const presentCount = students.filter(s => s.present).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mark Attendance</h1>

      {/* Course selector */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <Select onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourse && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Left: Scanner or manual */}
          <Card>
            <CardHeader>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={mode === 'qr' ? 'default' : 'outline'}
                  onClick={() => setMode('qr')}
                >
                  QR Scan
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'manual' ? 'default' : 'outline'}
                  onClick={() => setMode('manual')}
                >
                  Manual
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mode === 'qr' ? (
                <div>
                  <QRScanner onScan={handleQRScan} />
                  <div className="mt-4 space-y-1">
                    {scanLog.map((log, i) => (
                      <p key={i} className="text-sm text-green-600">{log}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {students.map(student => (
                    <label key={student.id} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={student.present}
                        onCheckedChange={() => toggleStudent(student.id)}
                      />
                      <span>{student.rollNo} — {student.name}</span>
                    </label>
                  ))}
                  <Button
                    className="w-full mt-4"
                    onClick={saveManualAttendance}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Attendance'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Present/Absent list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {presentCount}/{students.length} Present
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {students.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.rollNo} {s.name}</span>
                    <Badge variant={s.present ? 'default' : 'secondary'}>
                      {s.present ? 'Present' : 'Absent'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
```

---

## 2. Manual Attendance API — src/app/api/attendance/manual/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courseId, presentStudentIds } = await req.json()

  // Get all enrolled students
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { studentId: true },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Delete existing records for today (reset)
  await prisma.attendance.deleteMany({
    where: { courseId, date: { gte: today } }
  })

  // Create new records for all students
  await prisma.attendance.createMany({
    data: enrollments.map(({ studentId }) => ({
      studentId,
      courseId,
      markedById: session.user.id,
      status: presentStudentIds.includes(studentId) ? 'PRESENT' : 'ABSENT',
      method: 'MANUAL',
    }))
  })

  return NextResponse.json({ success: true })
}
```

---

## 3. View Attendance Page — src/app/attendance/view/page.tsx
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function ViewAttendancePage() {
  const [records, setRecords] = useState([])
  const [courses, setCourses] = useState([])
  const [filters, setFilters] = useState({
    courseId: '', date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(d => setCourses(d.courses))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(filters)
    fetch(`/api/attendance?${params}`).then(r => r.json()).then(d => setRecords(d.records))
  }, [filters])

  async function exportCSV() {
    const params = new URLSearchParams(filters)
    const res = await fetch(`/api/attendance/export?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${filters.date}.csv`
    a.click()
  }

  const presentCount = records.filter((r: any) => r.status === 'PRESENT').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">View Attendance</h1>
        <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
      </div>

      <div className="flex gap-4 mb-4">
        <Select onValueChange={(v) => setFilters(f => ({ ...f, courseId: v }))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
          <SelectContent>
            {(courses as any[]).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-40"
          value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
        />
        <span className="self-center text-sm text-muted-foreground">
          {presentCount}/{records.length} present
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Roll No</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(records as any[]).map((r: any) => (
            <TableRow key={r.id}>
              <TableCell>{r.student?.rollNo}</TableCell>
              <TableCell>{r.student?.name}</TableCell>
              <TableCell>{r.course?.code}</TableCell>
              <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant={r.status === 'PRESENT' ? 'default' : 'destructive'}>
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell>{r.method}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

---

## 4. Attendance API — src/app/api/attendance/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const date = searchParams.get('date')

  const where: any = {}
  if (courseId) where.courseId = courseId
  if (date) {
    const d = new Date(date)
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    where.date = { gte: d, lt: next }
  }

  const records = await prisma.attendance.findMany({
    where,
    include: {
      student: { select: { name: true, rollNo: true } },
      course: { select: { name: true, code: true } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ records })
}
```

---

## 5. CSV Export API — src/app/api/attendance/export/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const date = searchParams.get('date')

  const where: any = {}
  if (courseId) where.courseId = courseId
  if (date) {
    const d = new Date(date)
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    where.date = { gte: d, lt: next }
  }

  const records = await prisma.attendance.findMany({
    where,
    include: {
      student: true,
      course: true,
    },
    orderBy: { date: 'desc' },
  })

  // Build CSV manually (no package needed)
  const headers = 'Roll No,Name,Course,Date,Status,Method'
  const rows = records.map(r =>
    `${r.student.rollNo},${r.student.name},${r.course.code},${new Date(r.date).toLocaleDateString()},${r.status},${r.method}`
  )
  const csv = [headers, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="attendance.csv"`,
    }
  })
}
```