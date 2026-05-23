import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi, employeesApi } from '@/api/client'
import { useMenus } from '@/context/MenuContext'
import Modal from '@/components/Modal'
import FormField from '@/components/FormField'
import ConfirmDialog from '@/components/ConfirmDialog'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: number
  employee_id: number
  employee_name: string
  employee_no: string
  work_date: string
  clock_in_at: string | null
  clock_out_at: string | null
  status: string
  note: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPANY_ID = 1

const STATUS_OPTIONS = [
  'present', 'late', 'absent', 'sick', 'permit', 'leave', 'holiday', 'wfh',
] as const

const STATUS_BADGE: Record<string, string> = {
  present: 'badge-green',
  late:    'badge-yellow',
  absent:  'badge-red',
  sick:    'badge-yellow',
  permit:  'badge-navy',
  leave:   'badge-navy',
  holiday: 'badge-gray',
  wfh:     'badge-green',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10)
}
function weekStart() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1)
  return d.toISOString().slice(0, 10)
}
function formatTime(ts: string | null) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function duration(inTs: string | null, outTs: string | null) {
  if (!inTs || !outTs) return '—'
  const mins = Math.round((new Date(outTs).getTime() - new Date(inTs).getTime()) / 60000)
  if (mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY = {
  employee_id: '',
  work_date:   today(),
  clock_in_at: '',
  clock_out_at: '',
  status:      'present',
  note:        '',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Attendance() {
  const qc = useQueryClient()
  const { can } = useMenus()

  const [dateFrom, setDateFrom] = useState(weekStart())
  const [dateTo,   setDateTo]   = useState(today())
  const [formOpen, setFormOpen] = useState(false)
  const [editing,  setEditing]  = useState<AttendanceRecord | null>(null)
  const [deleting, setDeleting] = useState<AttendanceRecord | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Data
  const { data = [], isLoading, isError } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', COMPANY_ID, dateFrom, dateTo],
    queryFn:  () => attendanceApi.list(COMPANY_ID, dateFrom, dateTo),
    enabled:  !!dateFrom && !!dateTo,
  })
  const { data: employees = [] } = useQuery<{ id: number; full_name: string; employee_no: string }[]>({
    queryKey: ['employees', COMPANY_ID],
    queryFn:  () => employeesApi.list(COMPANY_ID),
    enabled:  formOpen,
  })

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (d: object) =>
      editing ? attendanceApi.update(editing.id, d) : attendanceApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
      closeForm()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => attendanceApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
      setDeleting(null)
    },
  })

  // Form helpers
  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY })
    setErrors({})
    setFormOpen(true)
  }
  const openEdit = (rec: AttendanceRecord) => {
    setEditing(rec)
    setForm({
      employee_id:  String(rec.employee_id),
      work_date:    rec.work_date,
      clock_in_at:  rec.clock_in_at  ? rec.clock_in_at.slice(0, 16)  : '',
      clock_out_at: rec.clock_out_at ? rec.clock_out_at.slice(0, 16) : '',
      status:       rec.status,
      note:         rec.note ?? '',
    })
    setErrors({})
    setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); setEditing(null) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.employee_id) e.employee_id = 'Employee is required'
    if (!form.work_date)   e.work_date   = 'Date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    saveMutation.mutate({
      employee_id:  Number(form.employee_id),
      work_date:    form.work_date,
      clock_in_at:  form.clock_in_at  || null,
      clock_out_at: form.clock_out_at || null,
      status:       form.status,
      note:         form.note || null,
    })
  }

  const serverErr = (saveMutation.error as { response?: { data?: { message?: string } } } | null)
    ?.response?.data?.message

  const emps = employees as { id: number; full_name: string; employee_no: string }[]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            Attendance
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            View and manage daily attendance records
          </p>
        </div>
        {can('attendance', 'create') && (
          <button className="btn-md btn-primary" onClick={openAdd}>
            + Add Record
          </button>
        )}
      </div>

      {/* Date filter */}
      <div className="card px-5 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm font-medium shrink-0" style={{ color: 'var(--gray-700)' }}>
            Date range
          </p>
          <input
            type="date"
            className="input w-36 text-sm py-1.5"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-sm" style={{ color: 'var(--gray-400)' }}>to</span>
          <input
            type="date"
            className="input w-36 text-sm py-1.5"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
          <div className="flex gap-2 ml-auto">
            {[
              { label: 'This week', from: weekStart(), to: today() },
              { label: 'Today',     from: today(),     to: today() },
            ].map(({ label, from, to }) => (
              <button
                key={label}
                className="btn-sm btn-secondary text-xs"
                onClick={() => { setDateFrom(from); setDateTo(to) }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary chips */}
      {!isLoading && data.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {STATUS_OPTIONS.map(s => {
            const count = data.filter(r => r.status === s).length
            if (!count) return null
            return (
              <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                   style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>
                <span className={`w-2 h-2 rounded-full inline-block ${STATUS_BADGE[s]?.replace('badge-', 'bg-') ?? ''}`}
                      style={s === 'present' || s === 'wfh' ? { background: 'var(--success-600)' }
                           : s === 'late' || s === 'sick'   ? { background: 'var(--warning-600)' }
                           : s === 'absent'                 ? { background: 'var(--danger-600)' }
                           : { background: 'var(--navy-500)' }} />
                {s}: <strong>{count}</strong>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--gray-200)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
            {isLoading ? 'Loading…' : `${data.length} records`}
          </p>
        </div>

        {isError ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--danger-600)' }}>
            Failed to load attendance records.
          </div>
        ) : isLoading ? (
          <div className="py-10 text-center">
            <div className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                 style={{ borderColor: 'var(--navy-500)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  {['Employee', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Status', 'Note', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((rec, i) => (
                  <tr
                    key={rec.id}
                    style={{ borderBottom: i < data.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>
                        {rec.employee_name}
                      </p>
                      <p className="text-xs font-mono" style={{ color: 'var(--gray-400)' }}>
                        {rec.employee_no}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--gray-700)' }}>
                      {rec.work_date}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--gray-700)' }}>
                      {formatTime(rec.clock_in_at)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--gray-700)' }}>
                      {formatTime(rec.clock_out_at)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gray-500)' }}>
                      {duration(rec.clock_in_at, rec.clock_out_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={STATUS_BADGE[rec.status] ?? 'badge-gray'}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: 'var(--gray-500)' }}>
                      {rec.note ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {can('attendance', 'edit') && (
                          <button className="btn-sm btn-ghost text-xs" onClick={() => openEdit(rec)}>
                            Edit
                          </button>
                        )}
                        {can('attendance', 'delete') && (
                          <button
                            className="btn-sm text-xs px-2 py-1 rounded-md transition-colors"
                            style={{ color: 'var(--danger-600)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-50)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                            onClick={() => setDeleting(rec)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--gray-400)' }}>
                  No attendance records found for the selected date range.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={formOpen}
        onClose={saveMutation.isPending ? () => {} : closeForm}
        title={editing ? 'Edit Attendance' : 'Add Attendance Record'}
        width="max-w-md"
      >
        {serverErr && (
          <div className="mb-4 rounded-md px-4 py-3 text-sm"
               style={{ background: 'var(--danger-50)', color: 'var(--danger-700)' }}>
            {serverErr}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Employee" required error={errors.employee_id}>
            <select
              className="input"
              value={form.employee_id}
              onChange={set('employee_id')}
              disabled={!!editing}
            >
              <option value="">— Select employee —</option>
              {emps.map(e => (
                <option key={e.id} value={e.id}>
                  {e.full_name} ({e.employee_no})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Work Date" required error={errors.work_date}>
            <input
              type="date"
              className="input"
              value={form.work_date}
              onChange={set('work_date')}
              disabled={!!editing}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Clock In">
              <input
                type="datetime-local"
                className="input text-sm"
                value={form.clock_in_at}
                onChange={set('clock_in_at')}
              />
            </FormField>
            <FormField label="Clock Out">
              <input
                type="datetime-local"
                className="input text-sm"
                value={form.clock_out_at}
                onChange={set('clock_out_at')}
              />
            </FormField>
          </div>

          <FormField label="Status">
            <select className="input" value={form.status} onChange={set('status')}>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Note">
            <textarea
              className="input resize-none"
              rows={2}
              value={form.note}
              onChange={set('note')}
              placeholder="Optional note…"
            />
          </FormField>

          <div className="flex gap-3 justify-end pt-2"
               style={{ borderTop: '1px solid var(--gray-200)' }}>
            <button
              type="button"
              className="btn-md btn-secondary"
              onClick={closeForm}
              disabled={saveMutation.isPending}
            >
              Cancel
            </button>
            <button type="submit" className="btn-md btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete Attendance Record"
        message={`Delete attendance record for ${deleting?.employee_name} on ${deleting?.work_date}?`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
