'use client'

import { useState, useEffect, useCallback } from 'react'

interface AttendanceRecord {
  id: string
  date: string
  checkOutTime: string | null
  workMinutes: number | null
  status: string
  method: string
  student: {
    id: string; name: string; rollNo: string; email: string | null
    contactNo: string | null; address: string | null
    state: string | null; country: string | null
  }
  course: { name: string; code: string }
}

interface Course { id: string; name: string; code: string }

const OPTIONAL_COLS = [
  { key: 'contactNo', label: 'Contact No' },
  { key: 'address', label: 'Address' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'rollNo', label: 'Reg. ID' },
]

const DEFAULT_FILTERS = {
  courseId: '',
  date: new Date().toISOString().split('T')[0],
  fromDate: '',
  toDate: '',
  studentName: '',
  studentEmail: '',
  rangeMode: false,
}

export default function ViewAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(false)
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    contactNo: false, address: false, state: false, country: false, rollNo: false,
  })

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(d => setCourses(d.courses ?? []))
  }, [])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.courseId) params.set('courseId', filters.courseId)
    if (filters.studentName) params.set('studentName', filters.studentName)
    if (filters.studentEmail) params.set('studentEmail', filters.studentEmail)
    if (filters.rangeMode) {
      if (filters.fromDate) params.set('fromDate', filters.fromDate)
      if (filters.toDate) params.set('toDate', filters.toDate)
    } else if (filters.date) {
      params.set('date', filters.date)
    }
    const res = await fetch(`/api/attendance?${params}`)
    const data = await res.json()
    setRecords(data.records ?? [])
    setLoading(false)
  }, [filters])

  useEffect(() => {
    const run = async () => {
      await loadRecords()
    }
    void run()
  }, [loadRecords])

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    setVisibleCols({ contactNo: false, address: false, state: false, country: false, rollNo: false })
  }

  async function exportCSV() {
    const params = new URLSearchParams()
    if (filters.courseId) params.set('courseId', filters.courseId)
    if (filters.studentName) params.set('studentName', filters.studentName)
    if (filters.studentEmail) params.set('studentEmail', filters.studentEmail)
    if (filters.rangeMode) {
      if (filters.fromDate) params.set('fromDate', filters.fromDate)
      if (filters.toDate) params.set('toDate', filters.toDate)
    } else if (filters.date) {
      params.set('date', filters.date)
    }
    const res = await fetch(`/api/attendance/export?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filters.rangeMode
      ? `attendance_${filters.fromDate || 'start'}_${filters.toDate || 'end'}.csv`
      : `attendance_${filters.date || 'today'}.csv`
    a.click()
  }

  // ── Present/Absent summary ──────────────────────────────────────────
  const isSearchingStudent = !!(filters.studentName || filters.studentEmail)
  const presentCount = records.filter(r => r.status === 'PRESENT').length
  const absentCount = records.filter(r => r.status === 'ABSENT').length

  // Weekend exclusion (for absent calculation per unique day)
  function isWeekend(d: Date) { const day = d.getDay(); return day === 0 || day === 6 }

  const absentDaysExcWeekends = (() => {
    if (!isSearchingStudent) return null
    const absentDates = records
      .filter(r => r.status === 'ABSENT')
      .map(r => new Date(r.date))
      .filter(d => !isWeekend(d))
    return new Set(absentDates.map(d => d.toDateString())).size
  })()

  const presentDays = (() => {
    if (!isSearchingStudent) return null
    const presentDates = records.filter(r => r.status === 'PRESENT').map(r => new Date(r.date))
    return new Set(presentDates.map(d => d.toDateString())).size
  })()

  function fmt(dt: string | null) {
    if (!dt) return '—'
    return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  function fmtDate(dt: string) {
    return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function fmtWork(mins: number | null) {
    if (mins === null) return '—'
    const h = Math.floor(mins / 60); const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto soft-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="mono-label">Analytics</p>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">View Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">Filter, search and export attendance records.</p>
        </div>
        <div className="flex gap-2">
          <button id="reset-filters-btn" onClick={resetFilters}
            className="bg-[#FFEDCE] border border-[#FFC193] hover:bg-[#FFC193]/40 text-foreground/80 font-medium py-2 px-4 rounded-full text-xs uppercase tracking-[0.06em] transition-colors">
            Reset Filters
          </button>
          <button id="export-csv-btn" onClick={exportCSV}
            className="bg-[#FF3737] text-white hover:bg-[#e83232] font-medium py-2 px-4 rounded-full text-xs uppercase tracking-[0.06em] transition-colors shadow-sm">
            Export CSV
          </button>
        </div>
      </div>

      <div className="premium-shell rounded-2xl p-5 mb-5 space-y-4 bg-white/88">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="mono-label mb-1 block">Course</label>
            <select id="filter-course" value={filters.courseId}
              onChange={e => setFilters(f => ({ ...f, courseId: e.target.value }))}
              className="border border-[#FFC193] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] bg-[#FFEDCE]/30">
              <option value="">All courses</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button onClick={() => setFilters(f => ({ ...f, rangeMode: false }))}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-[0.05em] font-medium transition-colors ${!filters.rangeMode ? 'bg-[#FF3737] text-white' : 'bg-[#FFEDCE] text-muted-foreground hover:bg-[#FFC193]/45'}`}>
              Single Date
            </button>
            <button onClick={() => setFilters(f => ({ ...f, rangeMode: true }))}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-[0.05em] font-medium transition-colors ${filters.rangeMode ? 'bg-[#FF3737] text-white' : 'bg-[#FFEDCE] text-muted-foreground hover:bg-[#FFC193]/45'}`}>
              Date Range
            </button>
          </div>

          {!filters.rangeMode ? (
            <div>
              <label className="mono-label mb-1 block">Date</label>
              <input id="filter-date" type="date" value={filters.date}
                onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
                className="border border-[#FFC193] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] bg-[#FFEDCE]/30" />
            </div>
          ) : (
            <>
              <div>
                <label className="mono-label mb-1 block">From Date</label>
                <input id="filter-from" type="date" value={filters.fromDate}
                  onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
                  className="border border-[#FFC193] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] bg-[#FFEDCE]/30" />
              </div>
              <div>
                <label className="mono-label mb-1 block">To Date</label>
                <input id="filter-to" type="date" value={filters.toDate}
                  onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
                  className="border border-[#FFC193] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] bg-[#FFEDCE]/30" />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="mono-label mb-1 block">Search by Name</label>
            <input id="filter-name" placeholder="Student name…" value={filters.studentName}
              onChange={e => setFilters(f => ({ ...f, studentName: e.target.value }))}
              className="border border-[#FFC193] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] w-48 bg-[#FFEDCE]/30" />
          </div>
          <div>
            <label className="mono-label mb-1 block">Search by Email</label>
            <input id="filter-email" type="email" placeholder="email@student.com" value={filters.studentEmail}
              onChange={e => setFilters(f => ({ ...f, studentEmail: e.target.value }))}
              className="border border-[#FFC193] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] w-52 bg-[#FFEDCE]/30" />
          </div>
          <div className="ml-auto text-sm text-muted-foreground self-end pb-2">
            {!loading && <span><span className="font-semibold text-[#1f1f1f]">{presentCount}</span> present · <span className="font-semibold text-[#8e2b2b]">{absentCount}</span> absent · <span className="font-semibold text-foreground/80">{records.length}</span> total</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center border-t border-[#FFC193] pt-3">
          <span className="mono-label">Show columns:</span>
          {OPTIONAL_COLS.map(col => (
            <label key={col.key} className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
              <input type="checkbox" checked={!!visibleCols[col.key]}
                onChange={e => setVisibleCols(v => ({ ...v, [col.key]: e.target.checked }))}
                className="w-3.5 h-3.5 accent-[#FF3737]" />
              {col.label}
            </label>
          ))}
        </div>
      </div>

      {isSearchingStudent && presentDays !== null && (
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-[#FFC193]/30 border border-[#FFC193] rounded-2xl p-5 text-center">
            <p className="text-3xl font-semibold text-[#1f1f1f]">{presentDays}</p>
            <p className="mono-label mt-1">Days Present</p>
          </div>
          <div className="bg-[#FF8383]/18 border border-[#FF8383]/55 rounded-2xl p-5 text-center">
            <p className="text-3xl font-semibold text-[#8e2b2b]">{absentDaysExcWeekends}</p>
            <p className="mono-label mt-1">Days Absent <span className="normal-case tracking-normal text-[11px]">(weekends excluded)</span></p>
          </div>
        </div>
      )}

      <div className="premium-shell rounded-2xl overflow-hidden bg-white/90">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground/80 text-sm">Loading records…</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground/80 text-sm">No attendance records found for selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FFEDCE]/65">
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Email</th>
                  <th className={th}>Course</th>
                  <th className={th}>Date</th>
                  <th className={th}>Check-In</th>
                  <th className={th}>Check-Out</th>
                  <th className={th}>Duration</th>
                  <th className={th}>Status</th>
                  <th className={th}>Method</th>
                  {OPTIONAL_COLS.filter(c => visibleCols[c.key]).map(c => (
                    <th key={c.key} className={th}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFC193]/55">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-[#FFEDCE]/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground/80">{r.student?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.student?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.course?.code}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{fmt(r.date)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{fmt(r.checkOutTime)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtWork(r.workMinutes)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                        r.status === 'PRESENT' ? 'bg-[#FFC193]/45 text-[#1f1f1f]' :
                        r.status === 'LATE' ? 'bg-[#FF8383]/25 text-[#8e2b2b]' :
                        'bg-[#FFEDCE] text-[#7f7f7f]'
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground/80 text-xs font-medium">
                      {r.method === 'QR_SCAN' ? 'QR Scan' : 'Manual'}
                    </td>
                    {visibleCols.contactNo && <td className="px-4 py-3 text-muted-foreground text-xs">{r.student?.contactNo ?? '—'}</td>}
                    {visibleCols.address && <td className="px-4 py-3 text-muted-foreground text-xs">{r.student?.address ?? '—'}</td>}
                    {visibleCols.state && <td className="px-4 py-3 text-muted-foreground text-xs">{r.student?.state ?? '—'}</td>}
                    {visibleCols.country && <td className="px-4 py-3 text-muted-foreground text-xs">{r.student?.country ?? '—'}</td>}
                    {visibleCols.rollNo && <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.student?.rollNo}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const th = 'text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap'
