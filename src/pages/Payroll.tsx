import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { payrollApi } from '@/api/client'
import { useMenus } from '@/context/MenuContext'
import Modal from '@/components/Modal'
import FormField from '@/components/FormField'
import ConfirmDialog from '@/components/ConfirmDialog'

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPANY_ID   = 1
const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface PayrollComponent {
  id:         number
  company_id: number
  code:       string
  name:       string
  type:       'earning' | 'deduction'
  category:   string
  calc_basis: 'fixed' | 'pct_basic' | 'pct_gross' | 'per_absent_day'
  rate:       number
  is_taxable: boolean
  sort_order: number
}

interface PayrollRun {
  id:               number
  company_id:       number
  period_year:      number
  period_month:     number
  working_days:     number
  status:           'draft' | 'locked' | 'paid'
  notes?:           string
  payslip_count:    number
  total_net:        number
  total_gross:      number
  total_deductions: number
  created_at:       string
}

interface Payslip {
  id:               number
  payroll_run_id:   number
  employee_id:      number
  employee_name:    string
  employee_no:      string
  department_name?: string
  basic_salary:     number
  gross_earnings:   number
  total_deductions: number
  net_salary:       number
  absent_days:      number
  leave_days:       number
  working_days:     number
}

interface PayslipItem {
  id:             number
  component_name: string
  type:           'earning' | 'deduction'
  amount:         number
  note?:          string
  sort_order:     number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  draft:  { bg: 'var(--gray-100)',    text: 'var(--gray-600)' },
  locked: { bg: 'var(--warning-50)',  text: 'var(--warning-700)' },
  paid:   { bg: 'var(--success-50)',  text: 'var(--success-700)' },
}

const CATEGORY_LABEL: Record<string, string> = {
  basic: 'Basic', allowance: 'Allowance', absence_cut: 'Absence Cut',
  bpjs_kes: 'BPJS Kes', bpjs_jht: 'BPJS JHT', bpjs_jkk: 'BPJS JKK',
  bpjs_jp: 'BPJS JP', tax: 'Tax / PPh', loan: 'Loan', custom: 'Custom',
}

const BASIS_LABEL: Record<string, string> = {
  fixed: 'Fixed amount',
  pct_basic: '% of basic salary',
  pct_gross: '% of gross earnings',
  per_absent_day: 'Per absent day',
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function exportToExcel(run: PayrollRun, payslips: Payslip[]) {
  const wb   = XLSX.utils.book_new()
  const period = `${MONTHS[run.period_month - 1]} ${run.period_year}`

  const info: unknown[][] = [
    ['Payroll Report', period],
    ['Status', run.status.toUpperCase()],
    ['Working Days', run.working_days],
    ['Total Employees', payslips.length],
    [],
  ]

  const headers = [
    'No', 'Employee Name', 'Employee No', 'Department',
    'Basic Salary', 'Gross Earnings', 'Total Deductions', 'Net Salary',
    'Absent Days', 'Leave Days',
  ]

  const rows = payslips.map((p, i) => [
    i + 1,
    p.employee_name,
    p.employee_no,
    p.department_name ?? '-',
    p.basic_salary,
    p.gross_earnings,
    p.total_deductions,
    p.net_salary,
    p.absent_days,
    p.leave_days,
  ])

  const totalsRow = [
    '', 'TOTAL', '', '',
    payslips.reduce((s, p) => s + p.basic_salary,     0),
    payslips.reduce((s, p) => s + p.gross_earnings,   0),
    payslips.reduce((s, p) => s + p.total_deductions, 0),
    payslips.reduce((s, p) => s + p.net_salary,       0),
    '', '',
  ]

  const ws = XLSX.utils.aoa_to_sheet([...info, headers, ...rows, [], totalsRow])
  ws['!cols'] = [
    { wch: 4 }, { wch: 30 }, { wch: 14 }, { wch: 22 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 12 }, { wch: 12 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Payroll')
  XLSX.writeFile(wb, `Payroll_${run.period_year}_${String(run.period_month).padStart(2, '0')}_${period.replace(' ', '_')}.xlsx`)
}

function Spinner() {
  return (
    <div className="px-5 py-12 flex justify-center">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
           style={{ borderColor: 'var(--navy-500)', borderTopColor: 'transparent' }} />
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

// ─── Component Modal ──────────────────────────────────────────────────────────

interface CompFormState {
  code: string; name: string; type: 'earning' | 'deduction'
  category: string; calc_basis: string; rate: string
  is_taxable: boolean; sort_order: string
}

const emptyCompForm = (): CompFormState => ({
  code: '', name: '', type: 'earning', category: 'allowance',
  calc_basis: 'fixed', rate: '0', is_taxable: false, sort_order: '0',
})

function ComponentModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: PayrollComponent | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CompFormState>(emptyCompForm())
  const [errors, setErrors] = useState<Partial<CompFormState>>({})

  useMemo(() => {
    if (editing) {
      setForm({
        code: editing.code, name: editing.name, type: editing.type,
        category: editing.category, calc_basis: editing.calc_basis,
        rate: String(editing.rate), is_taxable: editing.is_taxable,
        sort_order: String(editing.sort_order),
      })
    } else {
      setForm(emptyCompForm())
    }
    setErrors({})
  }, [editing, open])

  const set = (k: keyof CompFormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Partial<CompFormState> = {}
    if (!form.code.trim()) e.code = 'Required'
    if (!form.name.trim()) e.name = 'Required'
    if (isNaN(Number(form.rate))) e.rate = 'Invalid number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const mutation = useMutation({
    mutationFn: (d: object) =>
      editing ? payrollApi.updateComponent(editing.id, d) : payrollApi.createComponent(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-components'] }); onClose() },
  })

  const submit = () => {
    if (!validate()) return
    mutation.mutate({
      company_id:  COMPANY_ID,
      code:        form.code.trim().toUpperCase(),
      name:        form.name.trim(),
      type:        form.type,
      category:    form.category,
      calc_basis:  form.calc_basis,
      rate:        Number(form.rate),
      is_taxable:  form.is_taxable,
      sort_order:  Number(form.sort_order) || 0,
    })
  }

  const rateLabel = {
    fixed:          'Amount (Rp)',
    pct_basic:      'Rate (%)',
    pct_gross:      'Rate (%)',
    per_absent_day: 'Amount per day (Rp)',
  }[form.calc_basis] ?? 'Rate'

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Component' : 'Add Component'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Code" required error={errors.code}>
            <input className="input w-full font-mono uppercase" placeholder="e.g. TM"
                   value={form.code} onChange={e => set('code', e.target.value)} />
          </FormField>
          <FormField label="Name" required error={errors.name}>
            <input className="input w-full" placeholder="e.g. Transport Allowance"
                   value={form.name} onChange={e => set('name', e.target.value)} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Type" required>
            <select className="input w-full" value={form.type}
                    onChange={e => set('type', e.target.value)}>
              <option value="earning">Earning</option>
              <option value="deduction">Deduction</option>
            </select>
          </FormField>
          <FormField label="Category">
            <select className="input w-full" value={form.category}
                    onChange={e => set('category', e.target.value)}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Calculation Basis">
            <select className="input w-full" value={form.calc_basis}
                    onChange={e => set('calc_basis', e.target.value)}>
              {Object.entries(BASIS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FormField>
          <FormField label={rateLabel} required error={errors.rate}>
            <input className="input w-full" type="number" min={0} step="0.01"
                   value={form.rate} onChange={e => set('rate', e.target.value)} />
          </FormField>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm"
                 style={{ color: 'var(--gray-700)' }}>
            <input type="checkbox" className="w-4 h-4 rounded"
                   style={{ accentColor: 'var(--navy-500)' }}
                   checked={form.is_taxable}
                   onChange={e => set('is_taxable', e.target.checked)} />
            Taxable (masuk hitung PPh21)
          </label>
          <FormField label="Sort Order">
            <input className="input w-20" type="number"
                   value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
          </FormField>
        </div>

        {mutation.isError && (
          <p className="text-xs" style={{ color: 'var(--danger-600)' }}>Failed to save component.</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-md btn-secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button className="btn-md btn-primary" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Component'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Create Run Modal ─────────────────────────────────────────────────────────

function CreateRunModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [year, setYear]         = useState(String(CURRENT_YEAR))
  const [month, setMonth]       = useState(String(new Date().getMonth() + 1))
  const [workDays, setWorkDays] = useState('22')
  const [notes, setNotes]       = useState('')
  const [error, setError]       = useState('')

  useMemo(() => {
    if (open) { setYear(String(CURRENT_YEAR)); setMonth(String(new Date().getMonth() + 1)); setWorkDays('22'); setNotes(''); setError('') }
  }, [open])

  const mutation = useMutation({
    mutationFn: (d: object) => payrollApi.createRun(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-runs'] }); onClose() },
    onError: () => setError('Failed to create run. Period may already exist.'),
  })

  const submit = () => {
    if (!year || !month) { setError('Year and month are required'); return }
    setError('')
    mutation.mutate({
      company_id:   COMPANY_ID,
      period_year:  Number(year),
      period_month: Number(month),
      working_days: Number(workDays) || 22,
      notes:        notes.trim() || null,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Payroll Run" width="max-w-sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Year" required>
            <select className="input w-full" value={year} onChange={e => setYear(e.target.value)}>
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y =>
                <option key={y} value={y}>{y}</option>)}
            </select>
          </FormField>
          <FormField label="Month" required>
            <select className="input w-full" value={month} onChange={e => setMonth(e.target.value)}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Working Days">
          <input className="input w-full" type="number" min={1} max={31}
                 value={workDays} onChange={e => setWorkDays(e.target.value)} />
          <p className="mt-1 text-xs" style={{ color: 'var(--gray-400)' }}>
            Digunakan untuk hitung potongan per-hari
          </p>
        </FormField>
        <FormField label="Notes">
          <input className="input w-full" placeholder="Optional notes"
                 value={notes} onChange={e => setNotes(e.target.value)} />
        </FormField>
        {error && <p className="text-xs" style={{ color: 'var(--danger-600)' }}>{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-md btn-secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button className="btn-md btn-primary" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Run'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Payslip Detail Modal ─────────────────────────────────────────────────────

function PayslipModal({ open, onClose, payslipId }: { open: boolean; onClose: () => void; payslipId: number | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['payslip', payslipId],
    queryFn: () => payrollApi.payslip(payslipId!),
    enabled: !!payslipId && open,
  })

  const payslip: (Payslip & { period_year?: number; period_month?: number; company_name?: string; position_name?: string }) | null = data?.payslip ?? null
  const items: PayslipItem[] = data?.items ?? []
  const earnings   = items.filter(i => i.type === 'earning')
  const deductions = items.filter(i => i.type === 'deduction')

  return (
    <Modal open={open} onClose={onClose} title="Payslip Detail" width="max-w-lg">
      {isLoading ? <Spinner /> : !payslip ? <ErrorMsg message="Failed to load payslip." /> : (
        <div className="space-y-4 text-sm">
          {/* Header info */}
          <div className="rounded-lg px-4 py-3 space-y-1"
               style={{ background: 'var(--navy-50)', borderLeft: '4px solid var(--navy-500)' }}>
            <p className="font-semibold" style={{ color: 'var(--navy-800)', fontFamily: 'Montserrat' }}>
              {payslip.employee_name}
            </p>
            <p className="text-xs" style={{ color: 'var(--navy-600)' }}>
              {payslip.employee_no}
              {payslip.position_name ? ` · ${payslip.position_name}` : ''}
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--navy-500)' }}>
              {MONTHS[(payslip.period_month ?? 1) - 1]} {payslip.period_year}
            </p>
          </div>

          {/* Attendance summary */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Working Days', value: payslip.working_days },
              { label: 'Absent (cut)', value: payslip.absent_days, warn: payslip.absent_days > 0 },
              { label: 'Leave Days',   value: payslip.leave_days },
            ].map(({ label, value, warn }) => (
              <div key={label} className="rounded-md px-3 py-2"
                   style={{ background: 'var(--gray-50)' }}>
                <p className="text-xs" style={{ color: 'var(--gray-500)' }}>{label}</p>
                <p className="text-lg font-bold"
                   style={{ color: warn ? 'var(--warning-600)' : 'var(--gray-800)' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Earnings */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2"
               style={{ color: 'var(--gray-500)' }}>Earnings</p>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--gray-200)' }}>
              <div className="flex justify-between px-4 py-2.5"
                   style={{ borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ color: 'var(--gray-600)' }}>Basic Salary</span>
                <span className="font-medium" style={{ color: 'var(--gray-900)' }}>
                  {fmtMoney(payslip.basic_salary)}
                </span>
              </div>
              {earnings.map(item => (
                <div key={item.id} className="flex justify-between px-4 py-2.5"
                     style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <span style={{ color: 'var(--gray-600)' }}>{item.component_name}</span>
                    {item.note && <p className="text-xs" style={{ color: 'var(--gray-400)' }}>{item.note}</p>}
                  </div>
                  <span className="font-medium" style={{ color: 'var(--success-700)' }}>
                    {fmtMoney(item.amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 font-semibold"
                   style={{ background: 'var(--gray-50)' }}>
                <span style={{ color: 'var(--gray-700)' }}>Gross Earnings</span>
                <span style={{ color: 'var(--gray-900)' }}>{fmtMoney(payslip.gross_earnings)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          {deductions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                 style={{ color: 'var(--gray-500)' }}>Deductions</p>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--gray-200)' }}>
                {deductions.map(item => (
                  <div key={item.id} className="flex justify-between px-4 py-2.5"
                       style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <div>
                      <span style={{ color: 'var(--gray-600)' }}>{item.component_name}</span>
                      {item.note && <p className="text-xs" style={{ color: 'var(--gray-400)' }}>{item.note}</p>}
                    </div>
                    <span className="font-medium" style={{ color: 'var(--danger-600)' }}>
                      ({fmtMoney(item.amount)})
                    </span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 font-semibold"
                     style={{ background: 'var(--gray-50)' }}>
                  <span style={{ color: 'var(--gray-700)' }}>Total Deductions</span>
                  <span style={{ color: 'var(--danger-600)' }}>({fmtMoney(payslip.total_deductions)})</span>
                </div>
              </div>
            </div>
          )}

          {/* Net */}
          <div className="flex justify-between px-4 py-3 rounded-lg font-bold text-base"
               style={{ background: 'var(--navy-500)', color: '#fff' }}>
            <span>Net Take-Home</span>
            <span>{fmtMoney(payslip.net_salary)}</span>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Tab: Components ──────────────────────────────────────────────────────────

function ComponentsTab() {
  const qc = useQueryClient()
  const { can } = useMenus()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<PayrollComponent | null>(null)
  const [deleting, setDeleting]   = useState<PayrollComponent | null>(null)

  const { data: components = [], isLoading, isError } = useQuery<PayrollComponent[]>({
    queryKey: ['payroll-components', COMPANY_ID],
    queryFn:  () => payrollApi.components(COMPANY_ID),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => payrollApi.deleteComponent(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['payroll-components'] }); setDeleting(null) },
  })

  const earnings   = components.filter(c => c.type === 'earning')
  const deductions = components.filter(c => c.type === 'deduction')

  const openAdd  = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (c: PayrollComponent) => { setEditing(c); setModalOpen(true) }

  const ComponentTable = ({ items, title }: { items: PayrollComponent[]; title: string }) => (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 flex items-center justify-between"
           style={{ borderBottom: '1px solid var(--gray-200)', background: title === 'Earnings' ? 'var(--success-50)' : 'var(--danger-50)' }}>
        <p className="text-sm font-semibold"
           style={{ color: title === 'Earnings' ? 'var(--success-800)' : 'var(--danger-800)' }}>
          {title}
        </p>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: title === 'Earnings' ? 'var(--success-100)' : 'var(--danger-100)',
                       color: title === 'Earnings' ? 'var(--success-700)' : 'var(--danger-700)' }}>
          {items.length} items
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
              {['Code', 'Name', 'Category', 'Basis', 'Rate/Amount', 'Taxable', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--gray-500)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((c, i) => (
              <tr key={c.id} className="transition-colors"
                  style={{ borderBottom: i < items.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs px-2 py-0.5 rounded"
                        style={{ background: 'var(--navy-50)', color: 'var(--navy-700)' }}>
                    {c.code}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--gray-900)' }}>{c.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--gray-500)' }}>
                  {CATEGORY_LABEL[c.category] ?? c.category}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--gray-500)' }}>
                  {BASIS_LABEL[c.calc_basis]}
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--gray-800)' }}>
                  {c.calc_basis === 'fixed' || c.calc_basis === 'per_absent_day'
                    ? fmtMoney(c.rate)
                    : `${c.rate}%`}
                </td>
                <td className="px-4 py-3">
                  {c.is_taxable
                    ? <span className="badge-yellow text-xs">Yes</span>
                    : <span style={{ color: 'var(--gray-300)', fontSize: '13px' }}>—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    {can('payroll', 'edit') && (
                      <button className="btn-sm btn-ghost text-xs" onClick={() => openEdit(c)}>Edit</button>
                    )}
                    {can('payroll', 'delete') && (
                      <button className="btn-sm text-xs px-2 py-1 rounded-md transition-colors"
                              style={{ color: 'var(--danger-600)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-50)')}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}
                              onClick={() => setDeleting(c)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gray-400)' }}>
                  No {title.toLowerCase()} components configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {can('payroll', 'create') && (
          <button className="btn-md btn-primary" onClick={openAdd}>+ Add Component</button>
        )}
      </div>

      {isError ? <ErrorMsg message="Failed to load components." />
       : isLoading ? <Spinner />
       : (
        <>
          <ComponentTable items={earnings}   title="Earnings" />
          <ComponentTable items={deductions} title="Deductions" />
        </>
      )}

      <ComponentModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete Component"
        message={`Deactivate component "${deleting?.name}"? It will no longer appear on new payslips.`}
        confirmLabel="Delete" danger loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Download button (fetches payslips then exports) ─────────────────────────

function DownloadRunButton({ run }: { run: PayrollRun }) {
  const [busy, setBusy] = useState(false)

  const handleDownload = async () => {
    setBusy(true)
    try {
      const payslips: Payslip[] = await payrollApi.payslips(run.id)
      exportToExcel(run, payslips)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      className="btn-sm text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
      style={{ background: 'var(--success-50)', color: 'var(--success-700)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--success-100)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--success-50)')}
      disabled={busy}
      onClick={handleDownload}
    >
      {busy ? '…' : '↓ Excel'}
    </button>
  )
}

// ─── Tab: Payroll Runs ────────────────────────────────────────────────────────

function RunsTab({ onViewPayslips }: { onViewPayslips: (run: PayrollRun) => void }) {
  const qc = useQueryClient()
  const { can } = useMenus()
  const [createOpen, setCreateOpen] = useState(false)
  const [generating, setGenerating] = useState<number | null>(null)

  const { data: runs = [], isLoading, isError } = useQuery<PayrollRun[]>({
    queryKey: ['payroll-runs', COMPANY_ID],
    queryFn:  () => payrollApi.runs(COMPANY_ID),
  })

  const generateMutation = useMutation({
    mutationFn: (id: number) => { setGenerating(id); return payrollApi.generate(id) },
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['payroll-runs'] }); setGenerating(null) },
    onError:    () => setGenerating(null),
  })

  const lockMutation = useMutation({
    mutationFn: (id: number) => payrollApi.lock(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  })

  const paidMutation = useMutation({
    mutationFn: (id: number) => payrollApi.markPaid(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {can('payroll', 'create') && (
          <button className="btn-md btn-primary" onClick={() => setCreateOpen(true)}>
            + Create Payroll Run
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isError ? <ErrorMsg message="Failed to load payroll runs." />
         : isLoading ? <Spinner />
         : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  {['Period', 'Working Days', 'Status', 'Employees', 'Total Gross', 'Total Deductions', 'Total Net', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run, i) => {
                  const sc = STATUS_COLOR[run.status]
                  return (
                    <tr key={run.id} className="transition-colors"
                        style={{ borderBottom: i < runs.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
                          {MONTHS[run.period_month - 1]} {run.period_year}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-600)' }}>
                        {run.working_days} days
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold capitalize"
                              style={{ background: sc.bg, color: sc.text }}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
                        {run.payslip_count}
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-700)' }}>
                        {fmtMoney(run.total_gross)}
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--danger-600)' }}>
                        ({fmtMoney(run.total_deductions)})
                      </td>
                      <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--success-700)' }}>
                        {fmtMoney(run.total_net)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          {run.payslip_count > 0 && (
                            <button className="btn-sm btn-ghost text-xs" onClick={() => onViewPayslips(run)}>
                              View
                            </button>
                          )}
                          {run.payslip_count > 0 && (
                            <DownloadRunButton run={run} />
                          )}
                          {run.status === 'draft' && can('payroll', 'edit') && (
                            <button
                              className="btn-sm text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
                              style={{ background: 'var(--navy-50)', color: 'var(--navy-600)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--navy-100)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'var(--navy-50)')}
                              disabled={generating === run.id}
                              onClick={() => generateMutation.mutate(run.id)}
                            >
                              {generating === run.id ? 'Generating…' : 'Generate'}
                            </button>
                          )}
                          {run.status === 'draft' && run.payslip_count > 0 && can('payroll', 'edit') && (
                            <button
                              className="btn-sm text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
                              style={{ background: 'var(--warning-50)', color: 'var(--warning-700)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--warning-100)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'var(--warning-50)')}
                              disabled={lockMutation.isPending}
                              onClick={() => lockMutation.mutate(run.id)}
                            >
                              Lock
                            </button>
                          )}
                          {run.status === 'locked' && can('payroll', 'edit') && (
                            <button
                              className="btn-sm text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
                              style={{ background: 'var(--success-50)', color: 'var(--success-700)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--success-100)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'var(--success-50)')}
                              disabled={paidMutation.isPending}
                              onClick={() => paidMutation.mutate(run.id)}
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {runs.length === 0 && !isLoading && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm mb-3" style={{ color: 'var(--gray-400)' }}>No payroll runs yet.</p>
                {can('payroll', 'create') && (
                  <button className="btn-md btn-primary" onClick={() => setCreateOpen(true)}>
                    Create first run
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateRunModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

// ─── Payslips View ────────────────────────────────────────────────────────────

function PayslipsView({ run, onBack }: { run: PayrollRun; onBack: () => void }) {
  const [search, setSearch]         = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: payslips = [], isLoading, isError } = useQuery<Payslip[]>({
    queryKey: ['payslips', run.id],
    queryFn:  () => payrollApi.payslips(run.id),
  })

  const filtered = useMemo(() =>
    payslips.filter(p =>
      !search ||
      p.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      p.employee_no.includes(search)
    ),
  [payslips, search])

  const totals = useMemo(() => ({
    gross:      payslips.reduce((s, p) => s + p.gross_earnings, 0),
    deductions: payslips.reduce((s, p) => s + p.total_deductions, 0),
    net:        payslips.reduce((s, p) => s + p.net_salary, 0),
  }), [payslips])

  const sc = STATUS_COLOR[run.status]

  return (
    <div className="space-y-4">
      {/* Breadcrumb + title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn-sm btn-ghost text-sm" onClick={onBack}>← Back</button>
          <div>
            <h2 className="text-base font-semibold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
              {MONTHS[run.period_month - 1]} {run.period_year}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                    style={{ background: sc.bg, color: sc.text }}>{run.status}</span>
              <span className="text-xs" style={{ color: 'var(--gray-400)' }}>
                {run.working_days} working days · {payslips.length} employees
              </span>
            </div>
          </div>
        </div>
        {payslips.length > 0 && (
          <button
            className="btn-md flex items-center gap-2 font-medium text-sm"
            style={{ background: 'var(--success-600)', color: '#fff', borderRadius: '8px', padding: '8px 16px' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--success-700)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--success-600)')}
            onClick={() => exportToExcel(run, payslips)}
          >
            ↓ Download Excel
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Gross', value: totals.gross, color: 'var(--navy-500)' },
          { label: 'Total Deductions', value: totals.deductions, color: 'var(--danger-600)' },
          { label: 'Total Net', value: totals.net, color: 'var(--success-600)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card px-5 py-4">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-500)' }}>{label}</p>
            <p className="text-xl font-bold" style={{ fontFamily: 'Montserrat', color }}>{fmtMoney(value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between gap-3"
             style={{ borderBottom: '1px solid var(--gray-200)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
            {isLoading ? 'Loading…' : `${filtered.length} employees`}
          </p>
          <input className="input text-xs py-1.5 w-52" placeholder="Search name or employee no…"
                 value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {isError ? <ErrorMsg message="Failed to load payslips." />
         : isLoading ? <Spinner />
         : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  {['Employee', 'Dept', 'Basic Salary', 'Gross', 'Deductions', 'Net', 'Absent', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className="transition-colors"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium" style={{ color: 'var(--gray-900)' }}>{p.employee_name}</p>
                      <p className="text-xs" style={{ color: 'var(--gray-400)' }}>{p.employee_no}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--gray-500)' }}>
                      {p.department_name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-700)' }}>
                      {fmtMoney(p.basic_salary)}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-700)' }}>
                      {fmtMoney(p.gross_earnings)}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--danger-600)' }}>
                      {p.total_deductions > 0 ? `(${fmtMoney(p.total_deductions)})` : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--success-700)' }}>
                      {fmtMoney(p.net_salary)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-center">
                      {p.absent_days > 0
                        ? <span className="badge-yellow">{p.absent_days}d</span>
                        : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="btn-sm btn-ghost text-xs" onClick={() => setSelectedId(p.id)}>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !isLoading && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--gray-400)' }}>
                  {search ? 'No employees match search.' : 'No payslips generated yet.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <PayslipModal open={!!selectedId} onClose={() => setSelectedId(null)} payslipId={selectedId} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'components' | 'runs'

export default function Payroll() {
  const [activeTab, setActiveTab]       = useState<Tab>('runs')
  const [viewingRun, setViewingRun]     = useState<PayrollRun | null>(null)

  if (viewingRun) {
    return (
      <div className="p-6">
        <PayslipsView run={viewingRun} onBack={() => setViewingRun(null)} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
          Payroll
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
          Manage salary components, monthly payroll runs, and employee payslips
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--gray-100)' }}>
        {([
          { key: 'runs',       label: 'Payroll Runs' },
          { key: 'components', label: 'Salary Components' },
        ] as { key: Tab; label: string }[]).map(tab => (
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
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'runs'       && <RunsTab onViewPayslips={run => setViewingRun(run)} />}
      {activeTab === 'components' && <ComponentsTab />}
    </div>
  )
}
