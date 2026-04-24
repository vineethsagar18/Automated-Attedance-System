'use client'

import { useState } from 'react'

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
    setStudents(data.students ?? [])
    setLoading(false)
  }

  function downloadQR(student: StudentQR) {
    const a = document.createElement('a')
    a.href = student.qrCode
    a.download = `QR_${student.rollNo}_${student.name.replace(/\s+/g, '_')}.png`
    a.click()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto soft-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="mono-label">Identity</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">QR Code Generator</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate printable QR sets for every enrolled student.</p>
        </div>
        <div className="flex gap-2">
          <button
            id="generate-qr-btn"
            onClick={generateAll}
            disabled={loading}
            className="bg-[#FF3737] hover:bg-[#e83232] disabled:opacity-60 text-white font-medium py-2 px-5 rounded-full text-xs uppercase tracking-[0.06em] transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </span>
            ) : 'Generate All QR Codes'}
          </button>
          {students.length > 0 && (
            <button
              id="print-qr-btn"
              onClick={() => window.print()}
              className="bg-[#FFEDCE] border border-[#FFC193] hover:bg-[#FFC193]/40 text-foreground/80 font-medium py-2 px-4 rounded-full text-xs uppercase tracking-[0.06em] transition-colors print:hidden"
            >
              Print All
            </button>
          )}
        </div>
      </div>

      {students.length === 0 && !loading && (
        <div className="premium-shell rounded-2xl p-16 text-center bg-white/88">
          <p className="mono-label mb-3">QR Batch</p>
          <p className="font-semibold text-foreground/80">No QR codes generated yet</p>
          <p className="text-muted-foreground/80 text-sm mt-1">Click &quot;Generate All QR Codes&quot; to create QR codes for every student.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3">
        {students.map((student) => (
          <div
            key={student.id}
            className="premium-shell rounded-2xl p-4 text-center bg-white/90"
          >
            <img
              src={student.qrCode}
              alt={`QR code for ${student.name}`}
              className="w-32 h-32 mx-auto rounded-xl border border-[#FFC193]/60"
            />
            <p className="font-semibold text-foreground/90 mt-3 text-sm">{student.name}</p>
            <p className="text-xs font-mono text-muted-foreground/80 mt-0.5">{student.rollNo}</p>
            <button
              onClick={() => downloadQR(student)}
              className="mt-3 w-full text-xs border border-[#FFC193] hover:bg-[#FFEDCE]/35 text-muted-foreground hover:text-foreground/90 py-1.5 rounded-full transition-colors print:hidden uppercase tracking-[0.06em]"
            >
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
