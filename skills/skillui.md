# Skill: UI Layout & Dashboard

## When to use this skill
Building the dashboard layout, sidebar navigation, stats cards, and shadcn/ui setup.

---

## 1. shadcn/ui Setup
```bash
npx shadcn@latest init
# Choose: Default style, slate base color, yes CSS variables

# Install components you'll need:
npx shadcn@latest add button card input badge table select checkbox
npx shadcn@latest add sidebar sheet dropdown-menu avatar
```

---

## 2. Dashboard Layout — src/app/(dashboard)/layout.tsx
```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole={session.user.role} userName={session.user.name} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

---

## 3. Sidebar — src/components/Sidebar.tsx
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'

interface NavItem {
  href: string
  label: string
  icon: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/students', label: 'Students', icon: '👥', adminOnly: true },
  { href: '/courses', label: 'Courses', icon: '📚', adminOnly: true },
  { href: '/attendance/mark', label: 'Mark Attendance', icon: '✅' },
  { href: '/attendance/view', label: 'View Reports', icon: '📊' },
  { href: '/qr/generate', label: 'QR Codes', icon: '📱', adminOnly: true },
]

interface Props {
  userRole: string
  userName: string
}

export function Sidebar({ userRole, userName }: Props) {
  const pathname = usePathname()

  const visibleItems = navItems.filter(
    item => !item.adminOnly || userRole === 'ADMIN'
  )

  return (
    <aside className="w-64 bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg">📋 AttendEase</h1>
        <p className="text-xs text-muted-foreground">{userName}</p>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
          {userRole}
        </span>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {visibleItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === item.href
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          🚪 Sign Out
        </Button>
      </div>
    </aside>
  )
}
```

---

## 4. Dashboard Page — src/app/dashboard/page.tsx
```typescript
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

async function getStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [totalStudents, totalCourses, todayAttendance, totalAttendance] =
    await Promise.all([
      prisma.student.count(),
      prisma.course.count(),
      prisma.attendance.count({ where: { date: { gte: today, lt: tomorrow }, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { date: { gte: today, lt: tomorrow } } }),
    ])

  return { totalStudents, totalCourses, todayAttendance, totalAttendance }
}

export default async function DashboardPage() {
  const session = await auth()
  const stats = await getStats()
  const attendancePercent = stats.totalAttendance > 0
    ? Math.round((stats.todayAttendance / stats.totalAttendance) * 100)
    : 0

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-6">
        Welcome back, {session?.user.name}!
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Students" value={stats.totalStudents} icon="👥" color="blue" />
        <StatCard title="Courses" value={stats.totalCourses} icon="📚" color="green" />
        <StatCard title="Present Today" value={stats.todayAttendance} icon="✅" color="emerald" />
        <StatCard title="Today's Rate" value={`${attendancePercent}%`} icon="📊" color="purple" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <a href="/attendance/mark" className="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-100">
            ✅ Mark Attendance
          </a>
          <a href="/attendance/view" className="text-sm bg-gray-50 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100">
            📊 View Reports
          </a>
          <a href="/qr/generate" className="text-sm bg-green-50 text-green-700 px-4 py-2 rounded-md hover:bg-green-100">
            📱 Generate QR
          </a>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon, color }: {
  title: string; value: string | number; icon: string; color: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <Card>
      <CardContent className="pt-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${colorMap[color]}`}>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  )
}
```

---

## 5. Students Page — src/app/students/page.tsx (basic)
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [form, setForm] = useState({ name: '', rollNo: '', email: '' })
  const [adding, setAdding] = useState(false)

  async function loadStudents() {
    const res = await fetch('/api/students')
    const data = await res.json()
    setStudents(data.students)
  }

  useEffect(() => { loadStudents() }, [])

  async function addStudent(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ name: '', rollNo: '', email: '' })
    setAdding(false)
    loadStudents()
  }

  async function deleteStudent(id: string) {
    if (!confirm('Delete this student?')) return
    await fetch(`/api/students/${id}`, { method: 'DELETE' })
    loadStudents()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Students</h1>

      {/* Add form */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <form onSubmit={addStudent} className="flex gap-2">
            <Input
              placeholder="Full Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              placeholder="Roll No (CS001)"
              value={form.rollNo}
              onChange={e => setForm(f => ({ ...f, rollNo: e.target.value }))}
              required
            />
            <Input
              placeholder="Email (optional)"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            <Button type="submit" disabled={adding}>
              {adding ? 'Adding...' : 'Add Student'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Roll No</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(students as any[]).map((s: any) => (
            <TableRow key={s.id}>
              <TableCell>{s.rollNo}</TableCell>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.email || '—'}</TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteStudent(s.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

---

## 6. Students API — src/app/api/students/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2),
  rollNo: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')

  if (courseId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: { student: true },
    })
    return NextResponse.json({ students: enrollments.map(e => e.student) })
  }

  const students = await prisma.student.findMany({ orderBy: { rollNo: 'asc' } })
  return NextResponse.json({ students })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const student = await prisma.student.create({
    data: {
      name: parsed.data.name,
      rollNo: parsed.data.rollNo,
      email: parsed.data.email || null,
    }
  })
  return NextResponse.json({ student })
}
```

Add `src/app/api/students/[id]/route.ts` for DELETE:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.student.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
```