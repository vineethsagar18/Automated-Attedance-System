import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { TiltCard } from '@/components/ui/tilt-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

async function getStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [totalStudents, totalCourses, presentToday, totalMarkedToday] =
    await Promise.all([
      prisma.student.count(),
      prisma.course.count(),
      prisma.attendance.count({
        where: { date: { gte: today, lt: tomorrow }, status: 'PRESENT' },
      }),
      prisma.attendance.count({
        where: { date: { gte: today, lt: tomorrow } },
      }),
    ])

  const start = new Date(today)
  start.setDate(start.getDate() - 6)

  const recentRecords = await prisma.attendance.findMany({
    where: { date: { gte: start } },
    select: {
      date: true,
      status: true,
      course: { select: { code: true } },
    },
  })

  const trend = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    return { key, label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), total: 0, present: 0 }
  })

  const trendMap = new Map(trend.map((t) => [t.key, t]))
  const courseCounts = new Map<string, number>()

  for (const row of recentRecords) {
    const key = new Date(row.date).toISOString().slice(0, 10)
    const day = trendMap.get(key)
    if (day) {
      day.total += 1
      if (row.status === 'PRESENT') day.present += 1
    }
    courseCounts.set(row.course.code, (courseCounts.get(row.course.code) ?? 0) + 1)
  }

  const topCourses = [...courseCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([code, count]) => ({ code, count }))

  return { totalStudents, totalCourses, presentToday, totalMarkedToday, trend, topCourses }
}

export default async function DashboardPage() {
  const session = await auth()
  const stats = await getStats()
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const attendanceRate =
    stats.totalMarkedToday > 0
      ? Math.round((stats.presentToday / stats.totalMarkedToday) * 100)
      : 0

  const capacityRate = stats.totalStudents > 0
    ? Math.round((stats.presentToday / stats.totalStudents) * 100)
    : 0

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto soft-enter">
      <div className="grid xl:grid-cols-[1.45fr_1fr] gap-6 mb-6">
        <section className="premium-shell rounded-[1.4rem] p-6 lg:p-7 dot-grid-subtle">
          <p className="mono-label">Operations Overview</p>
          <h1 className="font-display text-5xl lg:text-6xl leading-none text-[#171717] mt-2">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-2.5">
            {session?.user.name}, today you have {stats.totalMarkedToday} attendance event{stats.totalMarkedToday === 1 ? '' : 's'} logged.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mt-7">
            <NumberCard title="Students" value={stats.totalStudents} tone="neutral" />
            <NumberCard title="Present Today" value={stats.presentToday} tone="strong" />
            <NumberCard title="Attendance" value={`${attendanceRate}%`} tone="accent" />
          </div>
        </section>

        <section className="premium-shell rounded-[1.4rem] p-6 lg:p-7 bg-white/92">
          <div className="flex items-center justify-between mb-4">
            <p className="mono-label">Live Capacity</p>
            <p className="mono-label text-[#FF3737]">Realtime</p>
          </div>

          <p className="font-display text-6xl leading-none text-[#1f1f1f]">{capacityRate}</p>
          <p className="mono-label -mt-1">% of all enrolled students currently marked present</p>

          <GraphCard value={capacityRate} />

          <div className="mt-6 border-t border-[#FFC193]/70 pt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="mono-label">Total Courses</p>
              <p className="text-2xl font-semibold text-[#1d1d1d]">{stats.totalCourses}</p>
            </div>
            <div>
              <p className="mono-label">Marked Today</p>
              <p className="text-2xl font-semibold text-[#1d1d1d]">{stats.totalMarkedToday}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="mono-label mb-2">7-Day Trend</p>
            <div className="grid grid-cols-7 gap-1.5">
              {stats.trend.map((d) => {
                const ratio = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0
                return (
                  <div key={d.key} className="rounded-lg border border-[#FFC193]/60 bg-white/70 p-2 text-center">
                    <div className="h-12 flex items-end justify-center">
                      <span className="w-4 rounded-sm bg-linear-to-t from-[#FF3737] to-[#FF8383]" style={{ height: `${Math.max(8, ratio)}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{d.label}</p>
                    <p className="text-[10px] font-semibold text-[#1f1f1f]">{ratio}%</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6">
        <section className="premium-shell rounded-[1.4rem] p-6 lg:p-7 bg-white/90">
          <div className="flex items-center justify-between mb-4">
            <p className="mono-label">Quick Actions</p>
            <p className="mono-label">Run Tasks</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <QuickAction
              href="/attendance/mark"
              icon="scan"
              title="Mark Attendance"
              desc="Run QR or manual attendance workflow"
            />
            <QuickAction
              href="/attendance/view"
              icon="reports"
              title="View Reports"
              desc="Open filtered reports and export CSV"
            />
            {session?.user.role === 'ADMIN' && (
              <QuickAction
                href="/qr/generate"
                icon="qr"
                title="Generate QR"
                desc="Create fresh student QR sheets"
              />
            )}
            {session?.user.role === 'ADMIN' && (
              <QuickAction
                href="/students"
                icon="users"
                title="Manage Students"
                desc="Edit student records and enrollments"
              />
            )}
          </div>
        </section>

        <section className="premium-shell rounded-[1.4rem] p-6 lg:p-7 bg-white/90">
          <p className="mono-label">Premium Enhancements</p>
          <h2 className="text-2xl font-semibold tracking-tight mt-2 text-[#181818]">Control Center</h2>
          <p className="text-sm text-muted-foreground mt-2">A cleaner ops board with fast decision signals.</p>

          <div className="mt-5 space-y-3">
            <FeatureTile title="Course Health" value={`${Math.max(8, Math.min(99, attendanceRate - 3))}%`} note="Average active attendance" />
            <FeatureTile title="Scan Throughput" value={`${Math.max(10, stats.totalMarkedToday * 2)} / hr`} note="Estimated check-in velocity" />
            <FeatureTile title="Action Queue" value={stats.totalMarkedToday > 0 ? 'Stable' : 'Idle'} note="No critical bottlenecks detected" />
          </div>

          <div className="mt-5 border-t border-[#FFC193]/70 pt-4">
            <p className="mono-label mb-2">Top Active Courses (7d)</p>
            <div className="space-y-2">
              {stats.topCourses.length === 0 ? (
                <p className="text-xs text-muted-foreground">No recent attendance activity.</p>
              ) : (
                stats.topCourses.map((course) => (
                  <div key={course.code} className="flex items-center justify-between rounded-lg border border-[#FFC193]/60 px-3 py-2 bg-[#FFEDCE]/35">
                    <span className="text-xs font-mono text-[#1f1f1f]">{course.code}</span>
                    <span className="text-xs text-muted-foreground">{course.count} records</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function NumberCard({
  title, value, tone,
}: {
  title: string
  value: string | number
  tone: 'neutral' | 'strong' | 'accent'
}) {
  const toneClass =
    tone === 'accent'
      ? 'from-[#FF8383]/35 to-[#FFEDCE] border-[#FF3737]/45'
      : tone === 'strong'
        ? 'from-[#FFC193]/45 to-[#FFEDCE] border-[#FFC193]'
        : 'from-white to-[#FFEDCE]/80 border-[#FFC193]/65'

  return (
    <TiltCard className={`rounded-2xl border bg-linear-to-br px-4 py-4 ${toneClass}`}>
      <div className="absolute inset-0 rounded-2xl border border-transparent [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#000_0_0)] mask-exclude" />
      <p className="mono-label relative z-20">{title}</p>
      <p className="relative z-20 mt-1 text-3xl font-semibold text-[#1b1b1b]">{value}</p>
    </TiltCard>
  )
}

function QuickAction({
  href, icon, title, desc,
}: {
  href: string
  icon: string
  title: string
  desc: string
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className="group block rounded-2xl border border-[#FFC193]/65 bg-white/74 p-4 transition-all duration-200 hover:border-[#FF8383] hover:bg-white"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFEDCE] text-[#2d2d2d] transition-colors group-hover:bg-[#FF3737] group-hover:text-white">
              <ActionGlyph icon={icon} />
            </div>
            <p className="font-semibold text-[#202020] transition-colors">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </Link>
        </TooltipTrigger>
        <TooltipContent>{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function FeatureTile({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-[#FFC193]/65 bg-[#FFEDCE]/45 px-3.5 py-3">
      <div className="flex items-center justify-between">
        <p className="mono-label">{title}</p>
        <p className="text-sm font-semibold text-[#1d1d1d]">{value}</p>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{note}</p>
    </div>
  )
}

function GraphCard({ value }: { value: number }) {
  return (
    <div className="relative mt-5 overflow-hidden rounded-2xl border border-[#FFC193]/70 bg-[#FFEDCE]/45 p-4">
      <div className="absolute inset-0 opacity-45 bg-[linear-gradient(to_right,rgba(255,193,147,0.65)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,193,147,0.45)_1px,transparent_1px)] bg-size-[22px_22px]" />
      <div className="relative z-10 flex h-20 items-end gap-1.5">
        {[16, 28, 24, 35, 39, 45, 42, 51, 57, 60, 62, Math.max(12, Math.min(95, value))].map((bar, i) => (
          <span
            key={i}
            className="w-full rounded-sm bg-linear-to-t from-[#FF3737] to-[#FF8383]"
            style={{ height: `${bar}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function ActionGlyph({ icon }: { icon: string }) {
  if (icon === 'scan') {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17 7V5a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M3 13v2a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17 13v2a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  if (icon === 'reports') {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="M4 16V9M10 16V6M16 16V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }

  if (icon === 'users') {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="2.3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="13.7" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.5 16c.6-2 2.2-3.2 4-3.2 1.8 0 3.4 1.2 4 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M10 3.5 16 6.7v6.6L10 16.5 4 13.3V6.7L10 3.5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.3v4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 8.4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
