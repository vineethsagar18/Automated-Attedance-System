'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs } from '@/components/ui/tabs'
import { MultiStepForm } from '@/components/ui/multi-step-form'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type Tab = 'register' | 'view' | 'update' | 'delete'
import { useToasts } from '@/components/ui/toast'

interface Student {
  id: string
  name: string
  rollNo: string
  email: string | null
  gender: string | null
  contactNo: string | null
  address: string | null
  state: string | null
  country: string | null
  profileImage: string | null
  createdAt: string
}

const EMPTY_FORM = {
  name: '', rollNo: '', email: '', gender: '', contactNo: '',
  address: '', state: '', country: '', profileImage: '',
}

export default function StudentsPage() {
  const [tab, setTab] = useState<Tab>('register')
  const [registerStep, setRegisterStep] = useState(1)
  const [updateStep, setUpdateStep] = useState(1)
  const [students, setStudents] = useState<Student[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [updateEmail, setUpdateEmail] = useState('')
  const [updateStudent, setUpdateStudent] = useState<Student | null>(null)
  const [updateForm, setUpdateForm] = useState(EMPTY_FORM)
  const toasts = useToasts()
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importCsvText, setImportCsvText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const updateFileRef = useRef<HTMLInputElement>(null)
  
  const loadStudents = useCallback(async () => {
    const res = await fetch('/api/students')
    const data = await res.json()
    setStudents(data.students ?? [])
  }, [])

  useEffect(() => {
    const run = async () => {
      await loadStudents()
    }
    void run()
  }, [loadStudents])

  const showMsg = (text: string, type: 'success' | 'error') => {
    if (type === 'success') {
      toasts.success(text)
    } else {
      toasts.error(text)
    }
  }

  // ── Image helper ───────────────────────────────────────────────────
  function handleImageFile(file: File, setter: (v: string) => void) {
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
      showMsg('Only JPEG images are supported.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setter(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  // ── Register ───────────────────────────────────────────────────────
  async function handleRegister() {
    setLoading(true)
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      showMsg(typeof data.error === 'string' ? data.error : 'Validation error. Check all fields.', 'error')
    } else {
      showMsg(`✅ ${data.student.name} registered successfully! ID: ${data.student.rollNo}`, 'success')
      setForm(EMPTY_FORM)
      setRegisterStep(1)
      if (fileRef.current) fileRef.current.value = ''
      loadStudents()
    }
  }

  // ── Update: find student ────────────────────────────────────────────
  async function findStudentByEmail() {
    if (!updateEmail) return
    const res = await fetch(`/api/students?email=${encodeURIComponent(updateEmail)}`)
    const data = await res.json()
    if (!res.ok) {
      showMsg('Email Not Found — no student with that email.', 'error')
      setUpdateStudent(null)
    } else {
      setUpdateStudent(data.student)
      setUpdateForm({
        name: data.student.name ?? '',
        rollNo: data.student.rollNo ?? '',
        email: data.student.email ?? '',
        gender: data.student.gender ?? '',
        contactNo: data.student.contactNo ?? '',
        address: data.student.address ?? '',
        state: data.student.state ?? '',
        country: data.student.country ?? '',
        profileImage: data.student.profileImage ?? '',
      })
      setUpdateStep(1)
    }
  }

  async function handleUpdate() {
    if (!updateStudent) return
    setLoading(true)
    const res = await fetch(`/api/students/${updateStudent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateForm),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      showMsg(typeof data.error === 'string' ? data.error : 'Update failed.', 'error')
    } else {
      showMsg(`✅ ${data.student.name} updated successfully!`, 'success')
      setUpdateEmail('')
      setUpdateStudent(null)
      setUpdateForm(EMPTY_FORM)
      setUpdateStep(1)
      if (updateFileRef.current) updateFileRef.current.value = ''
      loadStudents()
    }
  }

  // ── Delete ────────────────────────────────────────────────────────
  async function handleDelete(s: Student) {
    const confirmed = confirm(
      `Delete "${s.name}" (${s.rollNo})?\n\nThis will permanently remove:\n• User profile and details\n• Profile image\n• Generated QR code\n• All attendance records\n\nThis cannot be undone.`
    )
    if (!confirmed) { showMsg('Deletion cancelled.', 'error'); return }
    await fetch(`/api/students/${s.id}`, { method: 'DELETE' })
    showMsg(`${s.name} has been deleted.`, 'success')
    setSelectedStudent(null)
    loadStudents()
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const tabItems = useMemo(
    () => [
      { id: 'register', label: 'Register User' },
      { id: 'view', label: 'View Users' },
      { id: 'update', label: 'Update User' },
      { id: 'delete', label: 'Delete User' },
    ],
    []
  )

  function validateRegisterStep(step: number) {
    if (step === 1) {
      if (!form.name.trim() || !form.rollNo.trim()) {
        showMsg('Name and Roll No are required before moving next.', 'error')
        return false
      }
    }
    return true
  }

  function validateUpdateStep(step: number) {
    if (step === 1 && !updateForm.name.trim()) {
      showMsg('Name cannot be empty.', 'error')
      return false
    }
    return true
  }

  async function nextRegisterStep() {
    if (!validateRegisterStep(registerStep)) return
    if (registerStep < 3) {
      setRegisterStep((s) => s + 1)
      return
    }
    await handleRegister()
  }

  async function nextUpdateStep() {
    if (!updateStudent) return
    if (!validateUpdateStep(updateStep)) return
    if (updateStep < 2) {
      setUpdateStep((s) => s + 1)
      return
    }
    await handleUpdate()
  }

  async function handleCsvFile(file: File) {
    const text = await file.text()
    setImportCsvText(text)
  }

  async function importStudents() {
    if (!importCsvText.trim()) {
      showMsg('Paste CSV data or upload a CSV file first.', 'error')
      return
    }

    setImporting(true)
    const res = await fetch('/api/students/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText: importCsvText }),
    })
    const data = await res.json()
    setImporting(false)

    if (!res.ok) {
      showMsg(data?.message ?? 'Batch import failed.', 'error')
      return
    }

    const result = data.data
    showMsg(`Imported ${result.created} student(s), skipped ${result.skipped}.`, 'success')
    setImportCsvText('')
    loadStudents()
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="p-6 max-w-6xl mx-auto soft-enter">
      <div className="mb-6">
        <p className="mono-label">People Directory</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">User Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Register, view, update and delete students.</p>
      </div>

      <Tabs tabs={tabItems} activeTab={tab} onTabChange={(id) => setTab(id as Tab)} className="mb-6" />

      {/* ── Register Tab ── */}
      {tab === 'register' && (
        <div className="space-y-5">
          <div className="premium-shell rounded-2xl p-5 bg-white/88">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground/90">Batch Import Students (CSV)</p>
              <p className="mono-label">Fast Onboarding</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Headers supported: name, rollNo, email, gender, contactNo, address, state, country</p>
            <div className="grid sm:grid-cols-[1fr_auto] gap-3">
              <textarea
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                placeholder="name,rollNo,email\nAlice,CS001,alice@example.com"
                className="h-28 w-full border border-[#FFC193] rounded-xl px-3 py-2 text-sm bg-[#FFEDCE]/30"
              />
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleCsvFile(file)
                  }}
                  className="block w-full cursor-pointer text-xs text-muted-foreground file:mr-2 file:rounded-full file:border file:border-[#FFC193] file:bg-[#FFEDCE] file:px-3 file:py-1.5 file:text-[#1f1f1f]"
                />
                <button
                  type="button"
                  onClick={importStudents}
                  disabled={importing}
                  className="bg-[#FF3737] hover:bg-[#e83232] disabled:opacity-60 text-white font-medium py-2 px-4 rounded-full text-xs uppercase tracking-[0.06em] transition-colors"
                >
                  {importing ? 'Importing…' : 'Import CSV'}
                </button>
              </div>
            </div>
          </div>

          <MultiStepForm
            currentStep={registerStep}
            totalSteps={3}
            title="Register New Student"
            description="Use a guided flow to keep entries clean and consistent."
            onBack={() => setRegisterStep((s) => Math.max(1, s - 1))}
            onNext={nextRegisterStep}
            nextButtonText={registerStep === 3 ? (loading ? 'Registering...' : 'Register Student') : 'Next Step'}
            disableNext={loading}
            footerContent={
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM)
                  setRegisterStep(1)
                  if (fileRef.current) fileRef.current.value = ''
                }}
                className="mono-label text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear draft
              </button>
            }
          >
          {registerStep === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Name *" id="reg-name" tip="Student legal name.">
                <input id="reg-name" placeholder="e.g. Alice Johnson" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inp} />
              </Field>
              <Field label="Roll No / Registration ID *" id="reg-rollno" tip="Unique academic identifier.">
                <input id="reg-rollno" placeholder="e.g. CS001" value={form.rollNo}
                  onChange={e => setForm(f => ({ ...f, rollNo: e.target.value }))} required className={inp} />
              </Field>
              <Field label="Email Address" id="reg-email">
                <input id="reg-email" type="email" placeholder="student@example.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} />
              </Field>
              <Field label="Gender" id="reg-gender">
                <select id="reg-gender" value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className={inp + ' bg-card'}>
                  <option value="">Select gender</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </Field>
            </div>
          )}

          {registerStep === 2 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Contact Number (10 digits)" id="reg-contact">
                <input id="reg-contact" placeholder="9876543210" maxLength={10} value={form.contactNo}
                  onChange={e => setForm(f => ({ ...f, contactNo: e.target.value.replace(/\D/g, '') }))} className={inp} />
              </Field>
              <Field label="Country" id="reg-country">
                <input id="reg-country" placeholder="India" value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className={inp} />
              </Field>
              <Field label="Address" id="reg-address">
                <input id="reg-address" placeholder="123 Main Street" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inp} />
              </Field>
              <Field label="State" id="reg-state">
                <input id="reg-state" placeholder="Maharashtra" value={form.state}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inp} />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Profile Image (JPEG only)" id="reg-image" tip="Optional student avatar.">
                  <input id="reg-image" type="file" accept="image/jpeg,image/jpg" ref={fileRef}
                    onChange={e => { if (e.target.files?.[0]) handleImageFile(e.target.files[0], (v) => setForm(f => ({ ...f, profileImage: v }))) }}
                    className="block w-full cursor-pointer text-sm text-muted-foreground file:mr-3 file:rounded-full file:border file:border-[#FFC193] file:bg-[#FFEDCE] file:px-3 file:py-1.5 file:text-[#1f1f1f] hover:file:bg-[#FFC193]/45" />
                </Field>
                {form.profileImage && (
                  <img src={form.profileImage} alt="Preview" className="mt-2 h-16 w-16 rounded-full border border-[#FFC193] object-cover" />
                )}
              </div>
            </div>
          )}

          {registerStep === 3 && (
            <div className="rounded-2xl border border-[#FFC193]/70 bg-[#FFEDCE]/35 p-4">
              <p className="mono-label">Review Profile</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground/90">{form.name || 'Unnamed Student'}</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <span><strong>Roll No:</strong> {form.rollNo || '—'}</span>
                <span><strong>Email:</strong> {form.email || '—'}</span>
                <span><strong>Gender:</strong> {form.gender || '—'}</span>
                <span><strong>Contact:</strong> {form.contactNo || '—'}</span>
                <span><strong>State:</strong> {form.state || '—'}</span>
                <span><strong>Country:</strong> {form.country || '—'}</span>
              </div>
            </div>
          )}
          </MultiStepForm>
        </div>
      )}

      {/* ── View Tab ── */}
      {tab === 'view' && (
        <div className="premium-shell rounded-2xl overflow-hidden bg-white/90">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#FFC193]">
            <p className="text-sm font-medium text-foreground/80">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</p>
            <input id="view-search" placeholder="Search name, roll no, email…" value={search}
              onChange={e => { setSearch(e.target.value); setSelectedStudent(null) }}
              className="border border-[#FFC193] rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] w-64 bg-[#FFEDCE]/35" />
          </div>
          <Table>
            <TableHeader className="bg-[#FFEDCE]/60">
              <TableRow>
                <TableHead>Roll No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No students found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="mono-label">{s.rollNo}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.email ?? '—'}</TableCell>
                    <TableCell>{s.contactNo ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(s)}
                        className="rounded-lg border border-[#FFC193] bg-white px-3 py-1 text-xs font-medium hover:bg-[#FFEDCE]/35"
                      >
                        Open
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {selectedStudent && (
            <div className="border-t border-[#FFC193]/70 bg-[#FFEDCE]/30 p-5">
              <p className="mono-label">Selected Student</p>
              <h3 className="mt-1 text-lg font-semibold">{selectedStudent.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedStudent.rollNo} {selectedStudent.email ? `· ${selectedStudent.email}` : ''}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Update Tab ── */}
      {tab === 'update' && (
        <div className="premium-shell rounded-2xl p-6 bg-white/88">
          <h2 className="font-semibold text-foreground/90 mb-4">Update Student</h2>
          {/* Find by email */}
          <div className="flex gap-3 mb-6">
            <input id="update-email-search" type="email" placeholder="Enter student email to load their record"
              value={updateEmail} onChange={e => setUpdateEmail(e.target.value)}
              className={inp + ' flex-1'} />
            <button onClick={findStudentByEmail}
              className="bg-[#FF3737] hover:bg-[#e83232] text-white px-4 py-2 rounded-full text-xs uppercase tracking-[0.06em] font-medium">
              Find
            </button>
          </div>

          {updateStudent && (
            <div className="border-t border-[#FFC193] pt-5">
              <MultiStepForm
                size="lg"
                currentStep={updateStep}
                totalSteps={2}
                title={`Editing ${updateStudent.name}`}
                description="Update details safely before persisting to the database."
                onBack={() => setUpdateStep((s) => Math.max(1, s - 1))}
                onNext={nextUpdateStep}
                nextButtonText={updateStep === 2 ? (loading ? 'Saving...' : 'Save Changes') : 'Next Step'}
                disableNext={loading}
                footerContent={<span className="mono-label">{updateStudent.rollNo}</span>}
              >
                {updateStep === 1 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Full Name *" id="upd-name">
                      <input id="upd-name" value={updateForm.name}
                        onChange={e => setUpdateForm(f => ({ ...f, name: e.target.value }))} required className={inp} />
                    </Field>
                    <Field label="Gender" id="upd-gender">
                      <select id="upd-gender" value={updateForm.gender}
                        onChange={e => setUpdateForm(f => ({ ...f, gender: e.target.value }))} className={inp + ' bg-card'}>
                        <option value="">Select gender</option>
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </Field>
                    <Field label="Contact Number" id="upd-contact">
                      <input id="upd-contact" maxLength={10} value={updateForm.contactNo}
                        onChange={e => setUpdateForm(f => ({ ...f, contactNo: e.target.value.replace(/\D/g, '') }))} className={inp} />
                    </Field>
                    <Field label="Country" id="upd-country">
                      <input id="upd-country" value={updateForm.country}
                        onChange={e => setUpdateForm(f => ({ ...f, country: e.target.value }))} className={inp} />
                    </Field>
                  </div>
                )}

                {updateStep === 2 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Address" id="upd-address">
                      <input id="upd-address" value={updateForm.address}
                        onChange={e => setUpdateForm(f => ({ ...f, address: e.target.value }))} className={inp} />
                    </Field>
                    <Field label="State" id="upd-state">
                      <input id="upd-state" value={updateForm.state}
                        onChange={e => setUpdateForm(f => ({ ...f, state: e.target.value }))} className={inp} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Profile Image (JPEG only)" id="upd-image">
                        <input id="upd-image" type="file" accept="image/jpeg,image/jpg" ref={updateFileRef}
                          onChange={e => { if (e.target.files?.[0]) handleImageFile(e.target.files[0], (v) => setUpdateForm(f => ({ ...f, profileImage: v }))) }}
                          className="block w-full cursor-pointer text-sm text-muted-foreground file:mr-3 file:rounded-full file:border file:border-[#FFC193] file:bg-[#FFEDCE] file:px-3 file:py-1.5 file:text-[#1f1f1f] hover:file:bg-[#FFC193]/45" />
                      </Field>
                      {updateForm.profileImage && (
                        <img src={updateForm.profileImage} alt="Preview" className="mt-2 h-16 w-16 rounded-full border border-[#FFC193] object-cover" />
                      )}
                    </div>
                  </div>
                )}
              </MultiStepForm>
            </div>
          )}
        </div>
      )}

      {/* ── Delete Tab ── */}
      {tab === 'delete' && (
        <div className="premium-shell rounded-2xl overflow-hidden bg-white/90">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#FFC193]">
            <p className="text-sm font-medium text-foreground/80">Select a student to delete</p>
            <input id="delete-search" placeholder="Filter by name or email…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-[#FFC193] rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] w-60 bg-[#FFEDCE]/35" />
          </div>
          <Table>
            <TableHeader className="bg-[#FFEDCE]/65">
              <TableRow>
                <TableHead>Roll No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground/80">No students found.</TableCell>
                </TableRow>
              ) : (
                filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="mono-label">{s.rollNo}</TableCell>
                    <TableCell className="font-medium text-foreground/80">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <button onClick={() => handleDelete(s)}
                        className="rounded-full bg-[#FF8383]/25 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.06em] text-[#8a2a2a] transition-colors hover:bg-[#FF8383]/35">
                        Delete
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      </div>
    </TooltipProvider>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────
const inp = 'w-full border border-[#FFC193] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF3737] bg-[#FFEDCE]/30'

function Field({ label, id, children, tip }: { label: string; id: string; children: React.ReactNode; tip?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mono-label mb-1 flex items-center gap-1.5">
        {label}
        {tip && <InfoTip text={tip} />}
      </label>
      {children}
    </div>
  )
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#FFC193] text-[10px] text-muted-foreground hover:text-foreground">
          i
        </button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
