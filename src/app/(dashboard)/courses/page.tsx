'use client'

import { useState, useEffect, useCallback } from 'react'

interface Course {
  id: string
  name: string
  code: string
  faculty: { name: string }
  _count?: { enrollments: number }
}

interface FacultyUser {
  id: string
  name: string
  email: string
}

interface Student {
  id: string
  name: string
  rollNo: string
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [faculty, setFaculty] = useState<FacultyUser[]>([])
  const [form, setForm] = useState({ name: '', code: '', facultyId: '' })
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [savingEnrollments, setSavingEnrollments] = useState(false)

  const loadCourses = useCallback(async () => {
    setLoading(true)
    const [coursesRes, facultyRes] = await Promise.all([
      fetch('/api/courses'),
      fetch('/api/users'),
    ])
    const coursesData = await coursesRes.json()
    const facultyData = await facultyRes.json()
    setCourses(coursesData.courses ?? [])
    setFaculty(facultyData.users ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const run = async () => {
      await loadCourses()
    }
    void run()
  }, [loadCourses])

  useEffect(() => {
    if (!selectedCourseId) return

    fetch(`/api/courses/${selectedCourseId}/enrollments`)
      .then((r) => r.json())
      .then((d) => {
        const payload = d.data ?? d
        setAllStudents(payload.allStudents ?? [])
        setSelectedStudentIds(payload.enrolledStudentIds ?? [])
      })
  }, [selectedCourseId])

  async function addCourse(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ name: '', code: '', facultyId: '' })
    setAdding(false)
    loadCourses()
  }

  async function deleteCourse(id: string, name: string) {
    if (!confirm(`Delete course "${name}"?`)) return
    await fetch(`/api/courses/${id}`, { method: 'DELETE' })
    loadCourses()
  }

  function toggleEnrollment(studentId: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  async function saveEnrollments() {
    if (!selectedCourseId) return
    setSavingEnrollments(true)
    await fetch(`/api/courses/${selectedCourseId}/enrollments`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: selectedStudentIds }),
    })
    setSavingEnrollments(false)
    loadCourses()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto soft-enter">
      <div className="mb-6">
        <p className="mono-label">Academic Structure</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Courses</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage course units and faculty assignments.</p>
      </div>

      <div className="premium-shell rounded-2xl p-5 mb-6 bg-white/88">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground/90">Add New Course</h2>
          <p className="mono-label">Create</p>
        </div>
        <form onSubmit={addCourse} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            id="course-name"
            placeholder="Course Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="border border-[#FFC193] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] bg-[#FFEDCE]/30"
          />
          <input
            id="course-code"
            placeholder="Code (e.g. CS101) *"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            required
            className="border border-[#FFC193] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] bg-[#FFEDCE]/30 font-mono"
          />
          <select
            id="course-faculty"
            value={form.facultyId}
            onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}
            required
            className="border border-[#FFC193] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] bg-[#FFEDCE]/30"
          >
            <option value="">Select Faculty *</option>
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <button
            id="add-course-btn"
            type="submit"
            disabled={adding}
            className="bg-[#FF3737] hover:bg-[#e83232] disabled:opacity-60 text-white font-medium py-2 px-4 rounded-full text-xs uppercase tracking-[0.06em] transition-colors"
          >
            {adding ? 'Adding…' : 'Add Course'}
          </button>
        </form>
      </div>

      <div className="premium-shell rounded-2xl overflow-hidden bg-white/90">
        <div className="px-5 py-4 border-b border-[#FFC193] flex items-center justify-between">
          <p className="text-sm font-medium text-foreground/80">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
          <p className="mono-label">Live List</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground/80 text-sm">Loading…</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground/80 text-sm">No courses yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FFEDCE]/65">
              <tr>
                <th className="text-left px-5 py-3 mono-label">Code</th>
                <th className="text-left px-5 py-3 mono-label">Name</th>
                <th className="text-left px-5 py-3 mono-label">Faculty</th>
                <th className="text-left px-5 py-3 mono-label">Students</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FFC193]/55">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-[#FFEDCE]/30 transition-colors">
                  <td className="px-5 py-3 font-mono font-semibold text-[#1f1f1f] bg-[#FFC193]/22">{c.code}</td>
                  <td className="px-5 py-3 text-foreground/80 font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.faculty?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c._count?.enrollments ?? 0}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => deleteCourse(c.id, c.name)}
                      className="text-xs text-[#8a2a2a] hover:text-[#8a2a2a] hover:bg-[#FF8383]/20 px-2 py-1 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="premium-shell rounded-2xl p-5 mt-6 bg-white/88">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground/90">Course Enrollment Management</h2>
          <p className="mono-label">Assign Students</p>
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="mono-label mb-1 block">Course</label>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value)
                setAllStudents([])
                setSelectedStudentIds([])
              }}
              className="border border-[#FFC193] rounded-xl px-3 py-2 text-sm bg-[#FFEDCE]/30"
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!selectedCourseId || savingEnrollments}
            onClick={saveEnrollments}
            className="bg-[#FF3737] hover:bg-[#e83232] disabled:opacity-60 text-white font-medium py-2 px-4 rounded-full text-xs uppercase tracking-[0.06em] transition-colors"
          >
            {savingEnrollments ? 'Saving…' : 'Save Enrollments'}
          </button>
        </div>

        {!selectedCourseId ? (
          <p className="text-sm text-muted-foreground">Choose a course to manage enrollments.</p>
        ) : allStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students found in the system.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto border border-[#FFC193]/55 rounded-xl p-3 bg-[#FFEDCE]/20">
            {allStudents.map((student) => {
              const checked = selectedStudentIds.includes(student.id)
              return (
                <label key={student.id} className={`flex items-center gap-2 px-2 py-2 rounded-lg border cursor-pointer ${checked ? 'bg-[#FFC193]/35 border-[#FFC193]' : 'bg-white/70 border-transparent hover:bg-[#FFEDCE]/45'}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEnrollment(student.id)}
                    className="w-4 h-4 accent-[#FF3737]"
                  />
                  <span className="font-mono text-xs text-muted-foreground">{student.rollNo}</span>
                  <span className="text-sm text-foreground/85">{student.name}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
