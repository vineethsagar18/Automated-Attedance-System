'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const QRScanner = dynamic(
  () => import('@/components/QRScanner').then((m) => m.QRScanner),
  { ssr: false }
)

interface Course { id: string; name: string; code: string }
interface Student {
  id: string; name: string; rollNo: string
  profileImage?: string | null; email?: string | null
}

interface ScanResult {
  type: 'CHECK_IN' | 'CHECK_OUT' | 'TOO_EARLY' | 'ALREADY_DONE' | 'NOT_FOUND'
  message: string
  student?: Student
  workMinutes?: number
}

interface AttendanceSession {
  id: string
  token: string
  expiresAt: string
}

interface EnrolledStudent { id: string; name: string; rollNo: string; present: boolean }

export default function MarkAttendancePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [students, setStudents] = useState<EnrolledStudent[]>([])
  const [mode, setMode] = useState<'qr' | 'manual'>('qr')
  const [saving, setSaving] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [clock, setClock] = useState('')
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null)
  const [sessionMinutes, setSessionMinutes] = useState(45)
  const [sessionBusy, setSessionBusy] = useState(false)

  // Live clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(d => setCourses(d.courses ?? []))
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    fetch(`/api/students?courseId=${selectedCourse}`)
      .then(r => r.json())
      .then(d => setStudents((d.students ?? []).map((s: EnrolledStudent) => ({ ...s, present: false }))))
  }, [selectedCourse])

  useEffect(() => {
    if (!selectedCourse) return

    fetch(`/api/sessions?courseId=${selectedCourse}`)
      .then((r) => r.json())
      .then((d) => setActiveSession(d?.data?.activeSession ?? null))
      .catch(() => setActiveSession(null))
  }, [selectedCourse])

  async function startSession() {
    if (!selectedCourse) {
      alert('Please select a course first')
      return
    }
    setSessionBusy(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: selectedCourse, expiresInMinutes: sessionMinutes }),
    })
    const data = await res.json()
    setSessionBusy(false)
    if (!res.ok) {
      alert(data?.message ?? 'Failed to start session')
      return
    }
    setActiveSession(data.data.session)
  }

  async function closeSession() {
    if (!activeSession) return
    setSessionBusy(true)
    await fetch(`/api/sessions/${activeSession.id}/close`, { method: 'POST' })
    setSessionBusy(false)
    setActiveSession(null)
  }

  async function handleQRScan(studentId: string) {
    if (!selectedCourse) { alert('Please select a course first'); return }
    if (!activeSession?.token) { alert('Start an attendance session first'); return }

    const res = await fetch('/api/attendance/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, courseId: selectedCourse, token: activeSession.token }),
    })
    const payload = await res.json()

    if (!res.ok) {
      setScanResult({
        type: 'NOT_FOUND',
        message: payload?.message ?? 'Scan failed',
      })
      return
    }

    const data: ScanResult = payload.data
    setScanResult(data)

    if (data.type === 'CHECK_IN') {
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, present: true } : s))
    }

    // Auto-clear the result card after 5 seconds
    setTimeout(() => setScanResult(null), 5000)
  }

  function toggleStudent(id: string) {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, present: !s.present } : s))
  }

  async function saveManualAttendance() {
    if (!selectedCourse) return
    setSaving(true)
    await fetch('/api/attendance/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: selectedCourse,
        presentStudentIds: students.filter(s => s.present).map(s => s.id),
      }),
    })
    setSaving(false)
    alert('✅ Attendance saved!')
  }

  const presentCount = students.filter(s => s.present).length

  return (
    <div className="p-6 max-w-6xl mx-auto soft-enter">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="mono-label">Attendance Workflow</p>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Mark Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">Select a course, then run QR scanning or manual confirmation.</p>
        </div>
        <div className="border border-[#FFC193] bg-white/85 px-4 py-2 rounded-xl font-mono text-lg text-[#1f1f1f]">
          {clock}
        </div>
      </div>

      <div className="premium-shell rounded-2xl p-5 mb-5 bg-white/88">
        <label className="mono-label mb-2 block">Select Course</label>
        <select
          id="course-select"
          value={selectedCourse}
          onChange={e => {
            setSelectedCourse(e.target.value)
            setActiveSession(null)
          }}
          className="w-full max-w-sm border border-[#FFC193] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] bg-[#FFEDCE]/30"
        >
          <option value="">— Pick a course —</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
          ))}
        </select>

        <div className="mt-4 border-t border-[#FFC193]/70 pt-4">
          <p className="mono-label mb-2">QR Attendance Session</p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={5}
              max={180}
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Number(e.target.value) || 45)}
              className="w-24 border border-[#FFC193] rounded-xl px-2.5 py-1.5 text-sm bg-[#FFEDCE]/30"
            />
            <span className="text-xs text-muted-foreground">minutes</span>

            <button
              type="button"
              onClick={startSession}
              disabled={!selectedCourse || sessionBusy}
              className="ml-2 bg-[#FF3737] text-white hover:bg-[#e83232] disabled:opacity-60 px-3 py-1.5 rounded-full text-xs uppercase tracking-[0.05em]"
            >
              {sessionBusy ? 'Working…' : activeSession ? 'Restart Session' : 'Start Session'}
            </button>

            {activeSession && (
              <button
                type="button"
                onClick={closeSession}
                disabled={sessionBusy}
                className="bg-[#FFEDCE] border border-[#FFC193] hover:bg-[#FFC193]/45 px-3 py-1.5 rounded-full text-xs uppercase tracking-[0.05em]"
              >
                Close Session
              </button>
            )}
          </div>

          {activeSession ? (
            <p className="text-xs text-muted-foreground mt-2">
              Active until {new Date(activeSession.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">No active session. Start one before scanning QR.</p>
          )}
        </div>
      </div>

      {scanResult && (
        <div className={`mb-5 rounded-2xl p-4 border flex items-start gap-4 transition-all ${
          scanResult.type === 'CHECK_IN' ? 'bg-[#FFC193]/35 border-[#FFC193]' :
          scanResult.type === 'CHECK_OUT' ? 'bg-[#FF8383]/20 border-[#FF8383]/55' :
          scanResult.type === 'TOO_EARLY' ? 'bg-[#FFEDCE]/65 border-[#FFC193]/70' :
          'bg-[#FF8383]/20 border-[#FF8383]/55'
        }`}>
          {scanResult.student?.profileImage ? (
            <img src={scanResult.student.profileImage} alt={scanResult.student.name}
              className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-white shadow" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground shrink-0">
              {scanResult.student?.name?.charAt(0) ?? '?'}
            </div>
          )}
          <div>
            {scanResult.student && (
              <p className="font-semibold text-foreground/90 text-sm">{scanResult.student.name}
                <span className="ml-2 font-mono text-xs text-muted-foreground">{scanResult.student.rollNo}</span>
              </p>
            )}
            <p className={`text-sm mt-0.5 font-medium ${
              scanResult.type === 'CHECK_IN' ? 'text-[#1f1f1f]' :
              scanResult.type === 'CHECK_OUT' ? 'text-[#8f2a2a]' :
              scanResult.type === 'TOO_EARLY' ? 'text-foreground/80' :
              'text-[#8f2a2a]'
            }`}>{scanResult.message}</p>
            <p className="text-xs text-muted-foreground/80 mt-1">This card clears automatically in 5 seconds</p>
          </div>
        </div>
      )}

      {selectedCourse && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="premium-shell rounded-2xl overflow-hidden bg-white/90">
            <div className="flex border-b border-[#FFC193]">
              <button id="mode-qr" onClick={() => setMode('qr')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'qr' ? 'bg-[#FF3737] text-white' : 'text-muted-foreground hover:bg-[#FFEDCE]/40'}`}>
                QR Scan
              </button>
              <button id="mode-manual" onClick={() => setMode('manual')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-[#FF3737] text-white' : 'text-muted-foreground hover:bg-[#FFEDCE]/40'}`}>
                Manual
              </button>
            </div>
            <div className="p-5">
              {mode === 'qr' ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-3 text-center">
                    Click <strong>Start QR Scanner</strong> → allow camera access → hold student&apos;s QR code in frame
                  </p>
                  <QRScanner onScan={handleQRScan} />
                </div>
              ) : (
                <div>
                  <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
                    {students.length === 0 ? (
                      <p className="text-muted-foreground/80 text-sm text-center py-8">No students enrolled.</p>
                    ) : students.map(s => (
                      <label key={s.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${s.present ? 'bg-[#FFC193]/35 border border-[#FFC193]' : 'hover:bg-[#FFEDCE]/45 border border-transparent'}`}>
                        <input type="checkbox" checked={s.present}
                          onChange={() => toggleStudent(s.id)} className="w-4 h-4 accent-[#FF3737]" />
                        <span className="font-mono text-xs text-muted-foreground/80">{s.rollNo}</span>
                        <span className="text-sm text-foreground/80">{s.name}</span>
                      </label>
                    ))}
                  </div>
                  <button id="save-attendance-btn" onClick={saveManualAttendance}
                    disabled={saving || students.length === 0}
                    className="w-full bg-[#FF3737] hover:bg-[#e83232] disabled:opacity-60 text-white font-medium py-2.5 rounded-full text-sm transition-colors">
                    {saving ? 'Saving…' : 'Save Attendance'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="premium-shell rounded-2xl overflow-hidden bg-white/90">
            <div className="px-5 py-4 border-b border-[#FFC193] flex items-center justify-between">
              <p className="font-semibold text-foreground/90 text-sm">Attendance Status</p>
              <span className="text-sm bg-[#FFEDCE] text-[#1f1f1f] px-2.5 py-0.5 rounded-full font-medium border border-[#FFC193]">
                {presentCount}/{students.length}
              </span>
            </div>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {students.length === 0 ? (
                <p className="text-muted-foreground/80 text-sm text-center py-8">Student list will appear here.</p>
              ) : students.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded">
                  <span className="text-muted-foreground">
                    <span className="font-mono text-xs text-muted-foreground/80 mr-2">{s.rollNo}</span>
                    {s.name}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.present ? 'bg-[#FFC193]/45 text-[#1f1f1f]' : 'bg-muted text-muted-foreground'}`}>
                    {s.present ? '✓ Present' : 'Absent'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
