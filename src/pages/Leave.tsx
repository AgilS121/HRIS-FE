import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leaveApi, employeesApi } from '@/api/client'
import { useMenus } from '@/context/MenuContext'
import Modal from '@/components/Modal'
import FormField from '@/components/FormField'
import ConfirmDialog from '@/components/ConfirmDialog'

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPANY_ID = 1
const CURRENT_YEAR = new Date().getFullYear()

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaveType {
  id: number
  company_id: number
  code: string
  name: string
  quota_days: number
  is_paid: boolean
  min_advance_days: number
  carry_over_max: number
  is_encashable: boolean
}

interface LeaveBalance {
  id: number
  employee_id: number
  employee_name: string
  leave_type_id: number
  leave_type_name: string
  year: number
  quota_days: number
  adjusted_days: number
  used_days: number
  remaining_days: number
}

interface LeaveRequest {
  id: number
  employee_id: number
  employee_name: string
  leave_type_id: number
  leave_type_name: string
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_by_name?: string
  note?: string
  created_at: string
}

interface Employee {
  id: number
  full_name: string
  employee_no: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  pending:   'badge-yellow',
  approved:  'badge-green',
  rejected:  'badge-red',
  cancelled: 'badge-gray',
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function workingDays(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 0
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function Spinner() {
  return (
    <div className="px-5 py-12 flex justify-center">
      <div
        className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--navy-500)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

function ErrorMsg({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--danger-600)' }}>
      {message}
    </div>
  )
}

// ─── Leave Type Modal ─────────────────────────────────────────────────────────

interface TypeFormState {
  code: string
  name: string
  quota_days: string
  is_paid: boolean
  min_advance_days: string
  carry_over_max: string
  is_encashable: boolean
}

const emptyTypeForm = (): TypeFormState => ({
  code: '', name: '', quota_days: '12', is_paid: true,
  min_advance_days: '1', carry_over_max: '0', is_encashable: false,
})

interface LeaveTypeModalProps {
  open: boolean
  onClose: () => void
  editing: LeaveType | null
  companyId: number
}

function LeaveTypeModal({ open, onClose, editing, companyId }: LeaveTypeModalProps) {
  const qc = useQueryClient()
  const [form, setForm] = useState<TypeFormState>(emptyTypeForm())
  const [errors, setErrors] = useState<Partial<TypeFormState>>({})

  // Sync form when editing changes
  useMemo(() => {
    if (editing) {
      setForm({
        code: editing.code,
        name: editing.name,
        quota_days: String(editing.quota_days),
        is_paid: editing.is_paid,
        min_advance_days: String(editing.min_advance_days),
        carry_over_max: String(editing.carry_over_max),
        is_encashable: editing.is_encashable,
      })
    } else {
      setForm(emptyTypeForm())
    }
    setErrors({})
  }, [editing, open])

  const set = (k: keyof TypeFormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const validate = (): boolean => {
    const e: Partial<TypeFormState> = {}
    if (!form.code.trim()) e.code = 'Required'
    if (!form.name.trim()) e.name = 'Required'
    if (!form.quota_days || isNaN(Number(form.quota_days))) e.quota_days = 'Invalid number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const mutation = useMutation({
    mutationFn: (d: object) =>
      editing ? leaveApi.updateType(editing.id, d) : leaveApi.createType(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-types'] })
      onClose()
    },
  })

  const submit = () => {
    if (!validate()) return
    mutation.mutate({
      company_id:       companyId,
      code:             form.code.trim().toUpperCase(),
      name:             form.name.trim(),
      quota_days:       Number(form.quota_days),
      is_paid:          form.is_paid,
      min_advance_days: Number(form.min_advance_days) || 1,
      carry_over_max:   Number(form.carry_over_max) || 0,
      is_encashable:    form.is_encashable,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Leave Type' : 'Add Leave Type'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Code" required error={errors.code}>
            <input
              className="input w-full font-mono uppercase"
              placeholder="e.g. AL"
              value={form.code}
              onChange={e => set('code', e.target.value)}
            />
          </FormField>
          <FormField label="Name" required error={errors.name}>
            <input
              className="input w-full"
              placeholder="Annual Leave"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Quota (days/yr)" required error={errors.quota_days}>
            <input
              className="input w-full"
              type="number" min={0}
              value={form.quota_days}
              onChange={e => set('quota_days', e.target.value)}
            />
          </FormField>
          <FormField label="Min Advance (days)">
            <input
              className="input w-full"
              type="number" min={0}
              value={form.min_advance_days}
              onChange={e => set('min_advance_days', e.target.value)}
            />
          </FormField>
          <FormField label="Carry-Over Max">
            <input
              className="input w-full"
              type="number" min={0}
              value={form.carry_over_max}
              onChange={e => set('carry_over_max', e.target.value)}
            />
          </FormField>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm"
                 style={{ color: 'var(--gray-700)' }}>
            <input
              type="checkbox"
              checked={form.is_paid}
              onChange={e => set('is_paid', e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: 'var(--navy-500)' }}
            />
            Paid Leave
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm"
                 style={{ color: 'var(--gray-700)' }}>
            <input
              type="checkbox"
              checked={form.is_encashable}
              onChange={e => set('is_encashable', e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: 'var(--navy-500)' }}
            />
            Encashable
          </label>
        </div>

        {mutation.isError && (
          <p className="text-xs" style={{ color: 'var(--danger-600)' }}>
            Failed to save. Please try again.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-md btn-secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button className="btn-md btn-primary" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Type'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Leave Request Modal ──────────────────────────────────────────────────────

interface RequestFormState {
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  total_days: string
  reason: string
}

const emptyRequestForm = (): RequestFormState => ({
  employee_id: '', leave_type_id: '', start_date: '', end_date: '', total_days: '0', reason: '',
})

interface LeaveRequestModalProps {
  open: boolean
  onClose: () => void
  employees: Employee[]
  leaveTypes: LeaveType[]
}

function LeaveRequestModal({ open, onClose, employees, leaveTypes }: LeaveRequestModalProps) {
  const qc = useQueryClient()
  const [form, setForm] = useState<RequestFormState>(emptyRequestForm())
  const [errors, setErrors] = useState<Partial<RequestFormState>>({})

  useMemo(() => {
    if (open) { setForm(emptyRequestForm()); setErrors({}) }
  }, [open])

  const set = (k: keyof RequestFormState, v: string) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      // Auto-calc working days when dates change
      if ((k === 'start_date' || k === 'end_date')) {
        const start = k === 'start_date' ? v : f.start_date
        const end   = k === 'end_date'   ? v : f.end_date
        if (start && end) next.total_days = String(workingDays(start, end))
      }
      return next
    })
  }

  const validate = (): boolean => {
    const e: Partial<RequestFormState> = {}
    if (!form.employee_id)   e.employee_id   = 'Required'
    if (!form.leave_type_id) e.leave_type_id = 'Required'
    if (!form.start_date)    e.start_date    = 'Required'
    if (!form.end_date)      e.end_date      = 'Required'
    if (form.start_date && form.end_date && form.end_date < form.start_date)
      e.end_date = 'End date must be after start date'
    if (!form.reason.trim()) e.reason = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const mutation = useMutation({
    mutationFn: (d: object) => leaveApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] })
      qc.invalidateQueries({ queryKey: ['leave-requests-pending'] })
      qc.invalidateQueries({ queryKey: ['leave-balances-all'] })
      onClose()
    },
  })

  const submit = () => {
    if (!validate()) return
    mutation.mutate({
      employee_id:   Number(form.employee_id),
      leave_type_id: Number(form.leave_type_id),
      start_date:    form.start_date,
      end_date:      form.end_date,
      total_days:    Number(form.total_days) || 1,
      reason:        form.reason.trim(),
    })
  }

  // Selected type quota hint
  const selectedType = leaveTypes.find(t => t.id === Number(form.leave_type_id))

  return (
    <Modal open={open} onClose={onClose} title="New Leave Request" width="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Employee" required error={errors.employee_id}>
            <select
              className="input w-full"
              value={form.employee_id}
              onChange={e => set('employee_id', e.target.value)}
            >
              <option value="">Select employee…</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_no})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Leave Type" required error={errors.leave_type_id}>
            <select
              className="input w-full"
              value={form.leave_type_id}
              onChange={e => set('leave_type_id', e.target.value)}
            >
              <option value="">Select type…</option>
              {leaveTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {selectedType && (
          <div
            className="px-3 py-2 rounded-md text-xs"
            style={{ background: 'var(--navy-50)', color: 'var(--navy-700)' }}
          >
            Quota: {selectedType.quota_days} days/yr &nbsp;·&nbsp;
            Min advance: {selectedType.min_advance_days} day(s) &nbsp;·&nbsp;
            {selectedType.is_paid ? 'Paid' : 'Unpaid'}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Start Date" required error={errors.start_date}>
            <input
              className="input w-full"
              type="date"
              value={form.start_date}
              onChange={e => set('start_date', e.target.value)}
            />
          </FormField>
          <FormField label="End Date" required error={errors.end_date}>
            <input
              className="input w-full"
              type="date"
              min={form.start_date || undefined}
              value={form.end_date}
              onChange={e => set('end_date', e.target.value)}
            />
          </FormField>
          <FormField label="Total Days">
            <input
              className="input w-full"
              type="number" min={1}
              value={form.total_days}
              onChange={e => set('total_days', e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Reason" required error={errors.reason}>
          <textarea
            className="input w-full resize-none"
            rows={3}
            placeholder="State the reason for leave…"
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
          />
        </FormField>

        {mutation.isError && (
          <p className="text-xs" style={{ color: 'var(--danger-600)' }}>
            Failed to submit request. Please try again.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-md btn-secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button className="btn-md btn-primary" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Reject Note Modal ────────────────────────────────────────────────────────

interface RejectModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  loading: boolean
}

function RejectModal({ open, onClose, onConfirm, loading }: RejectModalProps) {
  const [note, setNote] = useState('')

  useMemo(() => { if (open) setNote('') }, [open])

  return (
    <Modal open={open} onClose={onClose} title="Reject Leave Request" width="max-w-sm">
      <div className="space-y-4">
        <FormField label="Rejection Note" required>
          <textarea
            className="input w-full resize-none"
            rows={3}
            placeholder="Reason for rejection…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </FormField>
        <div className="flex justify-end gap-3">
          <button className="btn-md btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-md"
            style={{ background: 'var(--danger-600)', color: '#fff', borderRadius: '8px', padding: '0 16px' }}
            onClick={() => note.trim() && onConfirm(note.trim())}
            disabled={loading || !note.trim()}
          >
            {loading ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Adjust Balance Modal ─────────────────────────────────────────────────────

interface AdjustModalProps {
  open: boolean
  onClose: () => void
  balance: LeaveBalance | null
}

function AdjustModal({ open, onClose, balance }: AdjustModalProps) {
  const qc = useQueryClient()
  const [days, setDays]     = useState('')
  const [reason, setReason] = useState('')
  const [error, setError]   = useState('')

  useMemo(() => { if (open) { setDays(''); setReason(''); setError('') } }, [open])

  const mutation = useMutation({
    mutationFn: (d: object) => leaveApi.adjust(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-balances-all'] })
      onClose()
    },
  })

  const submit = () => {
    if (!days || isNaN(Number(days))) { setError('Enter a valid number (positive to add, negative to deduct)'); return }
    if (!reason.trim()) { setError('Reason is required'); return }
    setError('')
    mutation.mutate({
      employee_id:   balance!.employee_id,
      leave_type_id: balance!.leave_type_id,
      year:          balance!.year,
      days:          Number(days),
      reason:        reason.trim(),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Adjust Leave Balance" width="max-w-sm">
      {balance && (
        <div className="space-y-4">
          <div
            className="px-3 py-2.5 rounded-md text-sm"
            style={{ background: 'var(--gray-50)', borderLeft: '3px solid var(--navy-500)' }}
          >
            <p className="font-medium" style={{ color: 'var(--gray-900)' }}>{balance.employee_name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--gray-500)' }}>
              {balance.leave_type_name} · {balance.year} · Remaining: {balance.remaining_days} days
            </p>
          </div>

          <FormField label="Days Adjustment" required>
            <input
              className="input w-full"
              type="number"
              placeholder="e.g. +2 or -1"
              value={days}
              onChange={e => setDays(e.target.value)}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--gray-400)' }}>
              Positive = add days, negative = deduct days
            </p>
          </FormField>

          <FormField label="Reason" required>
            <input
              className="input w-full"
              placeholder="e.g. Correction for carry-over"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </FormField>

          {(error || mutation.isError) && (
            <p className="text-xs" style={{ color: 'var(--danger-600)' }}>
              {error || 'Failed to adjust. Please try again.'}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-md btn-secondary" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </button>
            <button className="btn-md btn-primary" onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Apply Adjustment'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Init Balance Modal ───────────────────────────────────────────────────────

interface InitBalanceModalProps {
  open: boolean
  onClose: () => void
  employees: Employee[]
  leaveTypes: LeaveType[]
  year: number
}

function InitBalanceModal({ open, onClose, employees, leaveTypes, year }: InitBalanceModalProps) {
  const qc = useQueryClient()
  const [employeeId, setEmployeeId]     = useState('')
  const [leaveTypeId, setLeaveTypeId]   = useState('')
  const [quotaDays, setQuotaDays]       = useState('')
  const [errors, setErrors]             = useState<Record<string, string>>({})

  useMemo(() => {
    if (open) { setEmployeeId(''); setLeaveTypeId(''); setQuotaDays(''); setErrors({}) }
  }, [open])

  const mutation = useMutation({
    mutationFn: (d: object) => leaveApi.initBalance(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-balances-all'] })
      onClose()
    },
  })

  const submit = () => {
    const e: Record<string, string> = {}
    if (!employeeId)   e.employee_id   = 'Required'
    if (!leaveTypeId)  e.leave_type_id = 'Required'
    if (!quotaDays || isNaN(Number(quotaDays))) e.quota_days = 'Invalid number'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    mutation.mutate({
      employee_id:   Number(employeeId),
      leave_type_id: Number(leaveTypeId),
      year,
      quota_days:    Number(quotaDays),
    })
  }

  // Auto-fill quota from type
  const onTypeChange = (v: string) => {
    setLeaveTypeId(v)
    const t = leaveTypes.find(lt => lt.id === Number(v))
    if (t) setQuotaDays(String(t.quota_days))
  }

  return (
    <Modal open={open} onClose={onClose} title={`Init Balance — ${year}`} width="max-w-sm">
      <div className="space-y-4">
        <FormField label="Employee" required error={errors.employee_id}>
          <select className="input w-full" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
            <option value="">Select employee…</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_no})</option>
            ))}
          </select>
        </FormField>

        <FormField label="Leave Type" required error={errors.leave_type_id}>
          <select className="input w-full" value={leaveTypeId} onChange={e => onTypeChange(e.target.value)}>
            <option value="">Select type…</option>
            {leaveTypes.map(t => (
              <option key={t.id} value={t.id}>{t.code} — {t.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Quota Days" required error={errors.quota_days}>
          <input
            className="input w-full"
            type="number" min={0}
            value={quotaDays}
            onChange={e => setQuotaDays(e.target.value)}
          />
        </FormField>

        {mutation.isError && (
          <p className="text-xs" style={{ color: 'var(--danger-600)' }}>
            Failed to initialize balance. It may already exist.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-md btn-secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button className="btn-md btn-primary" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Initializing…' : 'Initialize Balance'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [search, setSearch] = useState('')

  const { data: balances = [], isLoading, isError } = useQuery<LeaveBalance[]>({
    queryKey: ['leave-balances-all', COMPANY_ID, year],
    queryFn: () => leaveApi.allBalances(COMPANY_ID, year),
  })

  const filtered = useMemo(() =>
    balances.filter(b =>
      !search ||
      b.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      b.leave_type_name.toLowerCase().includes(search.toLowerCase())
    ),
  [balances, search])

  // Summary stats
  const stats = useMemo(() => ({
    employees: new Set(balances.map(b => b.employee_id)).size,
    totalQuota: balances.reduce((s, b) => s + b.quota_days, 0),
    totalUsed:  balances.reduce((s, b) => s + b.used_days, 0),
  }), [balances])

  const yearOptions = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Employees with Balances', value: stats.employees, color: 'var(--navy-500)' },
          { label: 'Total Quota (days)',       value: stats.totalQuota, color: 'var(--success-600)' },
          { label: 'Total Used (days)',         value: stats.totalUsed, color: 'var(--warning-600)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card px-5 py-4">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-500)' }}>{label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Montserrat', color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between gap-3"
             style={{ borderBottom: '1px solid var(--gray-200)' }}>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium shrink-0" style={{ color: 'var(--gray-700)' }}>
              {isLoading ? 'Loading…' : `${filtered.length} records`}
            </p>
            <select
              className="input text-xs py-1.5 w-24"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <input
            className="input w-52 text-xs py-1.5"
            placeholder="Search employee or type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isError ? (
          <ErrorMsg message="Failed to load balances." />
        ) : isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  {['Employee', 'Leave Type', 'Quota', 'Adjusted', 'Used', 'Remaining'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const pct = b.quota_days > 0 ? Math.round((b.used_days / b.quota_days) * 100) : 0
                  const barColor = pct >= 90 ? 'var(--danger-500)' : pct >= 60 ? 'var(--warning-500)' : 'var(--success-500)'
                  return (
                    <tr
                      key={b.id}
                      className="transition-colors"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
                            style={{ background: 'var(--navy-50)', color: 'var(--navy-600)' }}
                          >
                            {b.employee_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>
                            {b.employee_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="badge-navy text-xs">{b.leave_type_name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-700)' }}>
                        {b.quota_days}
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: b.adjusted_days !== 0 ? 'var(--warning-700)' : 'var(--gray-400)' }}>
                        {b.adjusted_days !== 0 ? (b.adjusted_days > 0 ? `+${b.adjusted_days}` : b.adjusted_days) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <span className="text-sm" style={{ color: 'var(--gray-700)' }}>{b.used_days}</span>
                          <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--gray-200)' }}>
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: b.remaining_days <= 0 ? 'var(--danger-600)' : b.remaining_days <= 3 ? 'var(--warning-600)' : 'var(--success-600)' }}
                        >
                          {b.remaining_days}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && !isLoading && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--gray-400)' }}>
                  {search ? 'No records match your search.' : `No leave balances for ${year}.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Requests ────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'

interface RequestsTabProps {
  employees: Employee[]
  leaveTypes: LeaveType[]
  pendingCount: number
}

function RequestsTab({ employees, leaveTypes, pendingCount }: RequestsTabProps) {
  const qc = useQueryClient()
  const { can } = useMenus()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null)
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null)

  const { data: requests = [], isLoading, isError } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests', COMPANY_ID],
    queryFn: () => leaveApi.list(COMPANY_ID),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => leaveApi.approve(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] })
      qc.invalidateQueries({ queryKey: ['leave-requests-pending'] })
      qc.invalidateQueries({ queryKey: ['leave-balances-all'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => leaveApi.reject(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] })
      qc.invalidateQueries({ queryKey: ['leave-requests-pending'] })
      setRejectTarget(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => leaveApi.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] })
      qc.invalidateQueries({ queryKey: ['leave-requests-pending'] })
      qc.invalidateQueries({ queryKey: ['leave-balances-all'] })
      setCancelTarget(null)
    },
  })

  const filtered = useMemo(() =>
    requests.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (search && !r.employee_name.toLowerCase().includes(search.toLowerCase()) &&
          !r.leave_type_name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }),
  [requests, statusFilter, search])

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
              style={{
                background: statusFilter === f.key ? 'var(--navy-500)' : 'var(--gray-100)',
                color:      statusFilter === f.key ? '#fff' : 'var(--gray-600)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input text-xs py-1.5 w-48"
            placeholder="Search employee or type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {can('leave', 'create') && (
            <button className="btn-md btn-primary text-sm" onClick={() => setNewOpen(true)}>
              + New Request
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {isError ? (
          <ErrorMsg message="Failed to load leave requests." />
        ) : isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  {['Employee', 'Type', 'Dates', 'Days', 'Status', 'Reason', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((req, i) => (
                  <tr
                    key={req.id}
                    className="transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
                          style={{ background: 'var(--navy-50)', color: 'var(--navy-600)' }}
                        >
                          {req.employee_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--gray-900)' }}>
                          {req.employee_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="badge-navy text-xs">{req.leave_type_name}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--gray-600)' }}>
                      <div>{fmt(req.start_date)}</div>
                      <div style={{ color: 'var(--gray-400)' }}>to {fmt(req.end_date)}</div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-sm" style={{ color: 'var(--gray-800)' }}>
                      {req.total_days}d
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`${STATUS_BADGE[req.status] ?? 'badge-gray'} capitalize`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="text-xs truncate" style={{ color: 'var(--gray-600)' }} title={req.reason}>
                        {req.reason || <span style={{ color: 'var(--gray-300)' }}>—</span>}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        {req.status === 'pending' && can('leave', 'edit') && (
                          <>
                            <button
                              className="btn-sm text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
                              style={{ background: 'var(--success-50)', color: 'var(--success-700)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--success-100)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'var(--success-50)')}
                              onClick={() => approveMutation.mutate({ id: req.id })}
                              disabled={approveMutation.isPending}
                            >
                              Approve
                            </button>
                            <button
                              className="btn-sm text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
                              style={{ background: 'var(--danger-50)', color: 'var(--danger-700)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-100)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'var(--danger-50)')}
                              onClick={() => setRejectTarget(req)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(req.status === 'pending' || req.status === 'approved') && can('leave', 'delete') && (
                          <button
                            className="btn-sm btn-ghost text-xs"
                            onClick={() => setCancelTarget(req)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !isLoading && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--gray-400)' }}>
                  {search || statusFilter !== 'all'
                    ? 'No requests match the current filter.'
                    : 'No leave requests yet.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <LeaveRequestModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        employees={employees}
        leaveTypes={leaveTypes}
      />

      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={note => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, note })}
        loading={rejectMutation.isPending}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate({ id: cancelTarget.id })}
        title="Cancel Leave Request"
        message={`Cancel the leave request for ${cancelTarget?.employee_name} (${cancelTarget?.leave_type_name})?`}
        confirmLabel="Cancel Request"
        danger
        loading={cancelMutation.isPending}
      />
    </div>
  )
}

// ─── Tab: Leave Types ─────────────────────────────────────────────────────────

function LeaveTypesTab() {
  const qc = useQueryClient()
  const { can } = useMenus()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<LeaveType | null>(null)
  const [deleting, setDeleting]   = useState<LeaveType | null>(null)

  const { data: types = [], isLoading, isError } = useQuery<LeaveType[]>({
    queryKey: ['leave-types', COMPANY_ID],
    queryFn: () => leaveApi.types(COMPANY_ID),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => leaveApi.deleteType(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-types'] })
      setDeleting(null)
    },
  })

  const openAdd  = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (t: LeaveType) => { setEditing(t); setModalOpen(true) }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {can('leave', 'create') && (
          <button className="btn-md btn-primary" onClick={openAdd}>
            + Add Leave Type
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isError ? (
          <ErrorMsg message="Failed to load leave types." />
        ) : isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  {['Code', 'Name', 'Quota/yr', 'Paid', 'Min Advance', 'Carry-Over Max', 'Encashable', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {types.map((t, i) => (
                  <tr
                    key={t.id}
                    className="transition-colors"
                    style={{ borderBottom: i < types.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded"
                            style={{ background: 'var(--navy-50)', color: 'var(--navy-700)' }}>
                        {t.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--gray-900)' }}>
                      {t.name}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-700)' }}>
                      {t.quota_days} days
                    </td>
                    <td className="px-5 py-3.5">
                      {t.is_paid
                        ? <span className="badge-green">Paid</span>
                        : <span className="badge-gray">Unpaid</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-600)' }}>
                      {t.min_advance_days}d
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-600)' }}>
                      {t.carry_over_max > 0 ? `${t.carry_over_max}d` : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {t.is_encashable
                        ? <span className="badge-yellow">Yes</span>
                        : <span style={{ color: 'var(--gray-300)', fontSize: '13px' }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        {can('leave', 'edit') && (
                          <button className="btn-sm btn-ghost text-xs" onClick={() => openEdit(t)}>
                            Edit
                          </button>
                        )}
                        {can('leave', 'delete') && (
                          <button
                            className="btn-sm text-xs px-2 py-1 rounded-md transition-colors"
                            style={{ color: 'var(--danger-600)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-50)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                            onClick={() => setDeleting(t)}
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
            {types.length === 0 && !isLoading && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm mb-3" style={{ color: 'var(--gray-400)' }}>
                  No leave types configured yet.
                </p>
                {can('leave', 'create') && (
                  <button className="btn-md btn-primary" onClick={openAdd}>
                    Add first type
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <LeaveTypeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        companyId={COMPANY_ID}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete Leave Type"
        message={`Delete "${deleting?.name}"? This may affect existing balances and requests.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Tab: Balances ────────────────────────────────────────────────────────────

function BalancesTab({ employees, leaveTypes }: { employees: Employee[]; leaveTypes: LeaveType[] }) {
  const { can } = useMenus()
  const [year, setYear]           = useState(CURRENT_YEAR)
  const [search, setSearch]       = useState('')
  const [adjustTarget, setAdjust] = useState<LeaveBalance | null>(null)
  const [initOpen, setInitOpen]   = useState(false)

  const { data: balances = [], isLoading, isError } = useQuery<LeaveBalance[]>({
    queryKey: ['leave-balances-all', COMPANY_ID, year],
    queryFn: () => leaveApi.allBalances(COMPANY_ID, year),
  })

  const filtered = useMemo(() =>
    balances.filter(b =>
      !search ||
      b.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      b.leave_type_name.toLowerCase().includes(search.toLowerCase())
    ),
  [balances, search])

  const yearOptions = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            className="input text-sm py-1.5 w-24"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <input
            className="input text-xs py-1.5 w-52"
            placeholder="Search employee or type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {can('leave', 'create') && (
          <button className="btn-md btn-primary text-sm" onClick={() => setInitOpen(true)}>
            + Init Balance
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isError ? (
          <ErrorMsg message="Failed to load balances." />
        ) : isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  {['Employee', 'Leave Type', 'Quota', 'Adjusted', 'Used', 'Remaining', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr
                    key={b.id}
                    className="transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
                          style={{ background: 'var(--navy-50)', color: 'var(--navy-600)' }}
                        >
                          {b.employee_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>
                          {b.employee_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="badge-navy text-xs">{b.leave_type_name}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-700)' }}>
                      {b.quota_days}
                    </td>
                    <td className="px-5 py-3.5 text-sm"
                        style={{ color: b.adjusted_days !== 0 ? 'var(--warning-700)' : 'var(--gray-400)' }}>
                      {b.adjusted_days !== 0
                        ? (b.adjusted_days > 0 ? `+${b.adjusted_days}` : b.adjusted_days)
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-700)' }}>
                      {b.used_days}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="font-semibold text-sm"
                        style={{ color: b.remaining_days <= 0 ? 'var(--danger-600)' : b.remaining_days <= 3 ? 'var(--warning-600)' : 'var(--success-600)' }}
                      >
                        {b.remaining_days}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {can('leave', 'edit') && (
                        <button
                          className="btn-sm btn-ghost text-xs"
                          onClick={() => setAdjust(b)}
                        >
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !isLoading && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm mb-3" style={{ color: 'var(--gray-400)' }}>
                  {search ? 'No records match your search.' : `No leave balances for ${year}.`}
                </p>
                {!search && can('leave', 'create') && (
                  <button className="btn-md btn-primary" onClick={() => setInitOpen(true)}>
                    Initialize balances
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <AdjustModal
        open={!!adjustTarget}
        onClose={() => setAdjust(null)}
        balance={adjustTarget}
      />

      <InitBalanceModal
        open={initOpen}
        onClose={() => setInitOpen(false)}
        employees={employees}
        leaveTypes={leaveTypes}
        year={year}
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'overview' | 'requests' | 'types' | 'balances'

export default function Leave() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Shared queries for cross-tab data
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', COMPANY_ID],
    queryFn: () => employeesApi.list(COMPANY_ID),
  })

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ['leave-types', COMPANY_ID],
    queryFn: () => leaveApi.types(COMPANY_ID),
  })

  const { data: pendingRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests-pending', COMPANY_ID],
    queryFn: () => leaveApi.pending(COMPANY_ID),
    refetchInterval: 30_000,
  })

  const pendingCount = pendingRequests.length

  const TABS: { key: Tab; label: string | (() => React.ReactNode) }[] = [
    { key: 'overview',  label: 'Overview' },
    {
      key: 'requests',
      label: () => (
        <span className="flex items-center gap-1.5">
          Requests
          {pendingCount > 0 && (
            <span
              className="inline-flex items-center justify-center text-xs font-bold rounded-full px-1.5 min-w-[18px] h-[18px]"
              style={{ background: 'var(--warning-500)', color: '#fff' }}
            >
              {pendingCount}
            </span>
          )}
        </span>
      ),
    },
    { key: 'types',    label: 'Leave Types' },
    { key: 'balances', label: 'Balances' },
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
          Leave Management
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
          Manage leave types, balances, and employee requests
        </p>
      </div>

      {/* Pill Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'var(--gray-100)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.key ? '#fff' : 'transparent',
              color:      activeTab === tab.key ? 'var(--navy-600)' : 'var(--gray-500)',
              boxShadow:  activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {typeof tab.label === 'function' ? tab.label() : tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview'  && <OverviewTab />}
      {activeTab === 'requests'  && (
        <RequestsTab
          employees={employees}
          leaveTypes={leaveTypes}
          pendingCount={pendingCount}
        />
      )}
      {activeTab === 'types'     && <LeaveTypesTab />}
      {activeTab === 'balances'  && (
        <BalancesTab
          employees={employees}
          leaveTypes={leaveTypes}
        />
      )}
    </div>
  )
}
