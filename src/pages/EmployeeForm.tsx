import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesApi, departmentsApi, positionsApi, rolesApi } from '@/api/client'
import Modal from '@/components/Modal'
import FormField from '@/components/FormField'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: number
  company_id: number
  employee_no: string
  full_name: string
  nickname: string | null
  gender: string
  email: string | null
  phone: string | null
  birth_place: string | null
  birth_date: string | null
  national_id: string | null
  tax_id: string | null
  marital_status: string
  address: string | null
  department_id: number | null
  position_id: number | null
  join_date: string
  employment_type: string
  status: string
  contract_number: string | null
  contract_start: string | null
  contract_end: string | null
  contract_months: number | null
  contract_file: string | null
  bank_name: string | null
  bank_account_no: string | null
  bank_account_name: string | null
  salary_grade: string | null
  basic_salary: number | null
}

interface Props {
  open: boolean
  onClose: () => void
  employee?: Employee | null
  companyId: number
}

// ─── Tab definition ───────────────────────────────────────────────────────────

const TABS = ['Personal', 'Employment', 'Contract', 'Payroll'] as const
type Tab = (typeof TABS)[number]

// ─── Empty form state ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  // Personal
  full_name:        '',
  nickname:         '',
  gender:           'M',
  birth_place:      '',
  birth_date:       '',
  national_id:      '',
  tax_id:           '',
  marital_status:   'single',
  address:          '',
  email:            '',
  phone:            '',
  // Employment
  employee_no:      '',
  department_id:    '',
  position_id:      '',
  role_id:          '',
  join_date:        '',
  employment_type:  'permanent',
  salary_grade:     '',
  basic_salary:     '',
  // Contract
  contract_number:  '',
  contract_start:   '',
  contract_end:     '',
  contract_months:  '',
  // Payroll
  bank_name:        '',
  bank_account_no:  '',
  bank_account_name: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeMonths(start: string, end: string): number | null {
  if (!start || !end) return null
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  return months > 0 ? months : null
}

function nullable(v: string): string | null {
  return v.trim() === '' ? null : v.trim()
}

function nullableNum(v: string): number | null {
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function nullableInt(v: string): number | null {
  const n = parseInt(v, 10)
  return isNaN(n) ? null : n
}

// ─── Tab Panel wrapper ────────────────────────────────────────────────────────

function TabPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: active ? 'block' : 'none' }}>
      {children}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmployeeForm({ open, onClose, employee, companyId }: Props) {
  const qc        = useQueryClient()
  const isEdit    = !!employee
  const fileRef   = useRef<HTMLInputElement>(null)

  const [tab, setTab]             = useState<Tab>('Personal')
  const [form, setForm]           = useState(EMPTY_FORM)
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [generatingNo, setGeneratingNo] = useState(false)
  const [contractUploading, setContractUploading] = useState(false)
  const [contractUploadErr, setContractUploadErr] = useState<string | null>(null)

  // Reset when open/employee changes
  useEffect(() => {
    setTab('Personal')
    setErrors({})
    setContractFile(null)
    setContractUploadErr(null)
    if (employee) {
      setForm({
        full_name:         employee.full_name ?? '',
        nickname:          employee.nickname ?? '',
        gender:            employee.gender ?? 'M',
        birth_place:       employee.birth_place ?? '',
        birth_date:        employee.birth_date ?? '',
        national_id:       employee.national_id ?? '',
        tax_id:            employee.tax_id ?? '',
        marital_status:    employee.marital_status ?? 'single',
        address:           employee.address ?? '',
        email:             employee.email ?? '',
        phone:             employee.phone ?? '',
        employee_no:       employee.employee_no ?? '',
        department_id:     employee.department_id ? String(employee.department_id) : '',
        position_id:       employee.position_id   ? String(employee.position_id)   : '',
        join_date:         employee.join_date ?? '',
        employment_type:   employee.employment_type ?? 'permanent',
        salary_grade:      employee.salary_grade ?? '',
        basic_salary:      employee.basic_salary != null ? String(employee.basic_salary) : '',
        contract_number:   employee.contract_number ?? '',
        contract_start:    employee.contract_start ?? '',
        contract_end:      employee.contract_end ?? '',
        contract_months:   employee.contract_months != null ? String(employee.contract_months) : '',
        bank_name:         employee.bank_name ?? '',
        bank_account_no:   employee.bank_account_no ?? '',
        bank_account_name: employee.bank_account_name ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [employee, open])

  // Auto-compute contract_months when start/end change
  useEffect(() => {
    if (form.contract_start && form.contract_end) {
      const months = computeMonths(form.contract_start, form.contract_end)
      if (months !== null) {
        setForm(f => ({ ...f, contract_months: String(months) }))
      }
    }
  }, [form.contract_start, form.contract_end])

  // Lookup data
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => departmentsApi.list(companyId),
    enabled: open,
  })
  const { data: positions = [] } = useQuery({
    queryKey: ['positions', companyId],
    queryFn: () => positionsApi.list(companyId),
    enabled: open,
  })
  const { data: roles = [] } = useQuery({
    queryKey: ['roles', companyId],
    queryFn: () => rolesApi.list(companyId),
    enabled: open,
  })

  // Save mutation
  const mutation = useMutation({
    mutationFn: (data: object) =>
      isEdit
        ? employeesApi.updateFull(employee!.id, data)
        : employeesApi.createFull(data),
    onSuccess: async (saved) => {
      // If there's a pending contract file upload, do it now
      if (contractFile && saved?.id) {
        setContractUploading(true)
        setContractUploadErr(null)
        try {
          await employeesApi.uploadContract(saved.id, contractFile, {
            contract_number:  nullable(form.contract_number),
            contract_start:   nullable(form.contract_start),
            contract_end:     nullable(form.contract_end),
            contract_months:  nullableInt(form.contract_months),
          })
        } catch (e: unknown) {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
          setContractUploadErr(msg ?? 'Contract upload failed. Employee was saved.')
          setContractUploading(false)
          qc.invalidateQueries({ queryKey: ['employees'] })
          return
        }
        setContractUploading(false)
      }
      qc.invalidateQueries({ queryKey: ['employees'] })
      onClose()
    },
  })

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  // Generate employee number from API
  const handleGenerateNo = async () => {
    if (!form.department_id) {
      setErrors(e => ({ ...e, employee_no: 'Select a department first' }))
      return
    }
    setGeneratingNo(true)
    try {
      const result = await employeesApi.nextNo(Number(form.department_id))
      setForm(f => ({ ...f, employee_no: result.employee_no ?? result }))
      setErrors(e => { const n = { ...e }; delete n.employee_no; return n })
    } catch {
      setErrors(e => ({ ...e, employee_no: 'Failed to generate number' }))
    } finally {
      setGeneratingNo(false)
    }
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim())   e.full_name   = 'Full name is required'
    if (!form.employee_no.trim()) e.employee_no = 'Employee number is required'
    if (!form.join_date)          e.join_date   = 'Join date is required'
    setErrors(e)
    if (Object.keys(e).length > 0) {
      // Navigate to the tab containing the first error
      if (e.full_name) setTab('Personal')
      else if (e.employee_no || e.join_date) setTab('Employment')
    }
    return Object.keys(e).length === 0
  }

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    mutation.mutate({
      company_id:        companyId,
      employee_no:       form.employee_no,
      full_name:         form.full_name,
      nickname:          nullable(form.nickname),
      gender:            form.gender,
      birth_place:       nullable(form.birth_place),
      birth_date:        nullable(form.birth_date),
      national_id:       nullable(form.national_id),
      tax_id:            nullable(form.tax_id),
      marital_status:    form.marital_status,
      address:           nullable(form.address),
      email:             nullable(form.email),
      phone:             nullable(form.phone),
      department_id:     form.department_id ? Number(form.department_id) : null,
      position_id:       form.position_id   ? Number(form.position_id)   : null,
      role_id:           form.role_id       ? Number(form.role_id)       : null,
      join_date:         form.join_date,
      employment_type:   form.employment_type,
      salary_grade:      nullable(form.salary_grade),
      basic_salary:      nullableNum(form.basic_salary),
      contract_number:   nullable(form.contract_number),
      contract_start:    nullable(form.contract_start),
      contract_end:      nullable(form.contract_end),
      contract_months:   nullableInt(form.contract_months),
      bank_name:         nullable(form.bank_name),
      bank_account_no:   nullable(form.bank_account_no),
      bank_account_name: nullable(form.bank_account_name),
    })
  }

  const isPending = mutation.isPending || contractUploading
  const serverErr = (mutation.error as { response?: { data?: { message?: string } } } | null)
    ?.response?.data?.message

  // Filtered positions per selected department (if backend doesn't filter)
  const dept = departments as { id: number; name: string; code?: string }[]
  const pos  = positions  as { id: number; name: string; department_id?: number }[]
  const rol  = roles      as { id: number; name: string }[]

  return (
    <Modal
      open={open}
      onClose={isPending ? () => {} : onClose}
      title={isEdit ? 'Edit Employee' : 'Add Employee'}
      width="max-w-3xl"
    >
      <form onSubmit={submit}>
        {/* Error banner */}
        {(serverErr || contractUploadErr) && (
          <div
            className="mb-4 rounded-md px-4 py-3 text-sm"
            style={{ background: 'var(--danger-50)', color: 'var(--danger-700)' }}
          >
            {serverErr ?? contractUploadErr}
          </div>
        )}

        {/* Tab bar */}
        <div
          className="flex gap-0 mb-5 rounded-lg overflow-hidden text-sm font-medium"
          style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}
        >
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '10px 4px',
                borderRight: t !== 'Payroll' ? '1px solid var(--gray-200)' : undefined,
                background: tab === t ? 'var(--navy-500)' : 'transparent',
                color:      tab === t ? '#fff' : 'var(--gray-600)',
                transition: 'background 0.15s, color 0.15s',
                fontFamily: 'Montserrat',
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Tab: Personal ─────────────────────────────────────────────────── */}
        <TabPanel active={tab === 'Personal'}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name" required error={errors.full_name}>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={set('full_name')}
                  placeholder="John Doe"
                />
              </FormField>
              <FormField label="Nickname">
                <input
                  className="input"
                  value={form.nickname}
                  onChange={set('nickname')}
                  placeholder="John"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Gender" required>
                <select className="input" value={form.gender} onChange={set('gender')}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </FormField>
              <FormField label="Marital Status">
                <select className="input" value={form.marital_status} onChange={set('marital_status')}>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Birth Place">
                <input
                  className="input"
                  value={form.birth_place}
                  onChange={set('birth_place')}
                  placeholder="Jakarta"
                />
              </FormField>
              <FormField label="Birth Date">
                <input
                  className="input"
                  type="date"
                  value={form.birth_date}
                  onChange={set('birth_date')}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="National ID (KTP / NIK)">
                <input
                  className="input font-mono"
                  value={form.national_id}
                  onChange={set('national_id')}
                  placeholder="3171xxxxxxxxxxxxxxx"
                  maxLength={30}
                />
              </FormField>
              <FormField label="Tax ID (NPWP)">
                <input
                  className="input font-mono"
                  value={form.tax_id}
                  onChange={set('tax_id')}
                  placeholder="xx.xxx.xxx.x-xxx.xxx"
                  maxLength={30}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email">
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="john@company.com"
                />
              </FormField>
              <FormField label="Phone">
                <input
                  className="input"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="+62 812 xxxx xxxx"
                />
              </FormField>
            </div>

            <FormField label="Address">
              <textarea
                className="input"
                rows={3}
                value={form.address}
                onChange={set('address')}
                placeholder="Street, City, Province, ZIP"
                style={{ resize: 'vertical' }}
              />
            </FormField>
          </div>
        </TabPanel>

        {/* ── Tab: Employment ───────────────────────────────────────────────── */}
        <TabPanel active={tab === 'Employment'}>
          <div className="space-y-4">
            {/* Employee No with Generate button */}
            <FormField label="Employee Number" required error={errors.employee_no}>
              <div className="flex gap-2">
                <input
                  className="input flex-1 font-mono"
                  value={form.employee_no}
                  onChange={set('employee_no')}
                  placeholder="IT-2026001"
                />
                <button
                  type="button"
                  onClick={handleGenerateNo}
                  disabled={generatingNo || !form.department_id}
                  className="btn-md btn-secondary shrink-0 text-xs"
                  style={{ minWidth: 90 }}
                  title={!form.department_id ? 'Select a department first' : 'Auto-generate'}
                >
                  {generatingNo ? 'Wait…' : 'Generate'}
                </button>
              </div>
              {!form.department_id && (
                <p className="mt-1 text-xs" style={{ color: 'var(--gray-400)' }}>
                  Select department below to enable auto-generate.
                </p>
              )}
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Department">
                <select
                  className="input"
                  value={form.department_id}
                  onChange={set('department_id')}
                >
                  <option value="">— Select —</option>
                  {dept.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Position">
                <select
                  className="input"
                  value={form.position_id}
                  onChange={set('position_id')}
                >
                  <option value="">— Select —</option>
                  {pos.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Role & Access">
              <select
                className="input"
                value={form.role_id}
                onChange={set('role_id')}
                disabled={isEdit}
              >
                <option value="">— No role (unrestricted) —</option>
                {rol.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {isEdit && (
                <p className="mt-1 text-xs" style={{ color: 'var(--gray-400)' }}>
                  Change role from the Roles & Permissions page.
                </p>
              )}
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Join Date" required error={errors.join_date}>
                <input
                  className="input"
                  type="date"
                  value={form.join_date}
                  onChange={set('join_date')}
                />
              </FormField>
              <FormField label="Employment Type">
                <select className="input" value={form.employment_type} onChange={set('employment_type')}>
                  <option value="permanent">Permanent</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                  <option value="outsource">Outsource</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Salary Grade">
                <input
                  className="input"
                  value={form.salary_grade}
                  onChange={set('salary_grade')}
                  placeholder="G3 / Level-5 / etc."
                />
              </FormField>
              <FormField label="Basic Salary (IDR)">
                <input
                  className="input font-mono"
                  type="number"
                  min="0"
                  step="1000"
                  value={form.basic_salary}
                  onChange={set('basic_salary')}
                  placeholder="5000000"
                />
              </FormField>
            </div>
          </div>
        </TabPanel>

        {/* ── Tab: Contract ─────────────────────────────────────────────────── */}
        <TabPanel active={tab === 'Contract'}>
          <div className="space-y-4">
            <FormField label="Contract Number">
              <input
                className="input font-mono"
                value={form.contract_number}
                onChange={set('contract_number')}
                placeholder="PKB/2026/IT/001"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Contract Start">
                <input
                  className="input"
                  type="date"
                  value={form.contract_start}
                  onChange={set('contract_start')}
                />
              </FormField>
              <FormField label="Contract End">
                <input
                  className="input"
                  type="date"
                  value={form.contract_end}
                  onChange={set('contract_end')}
                />
              </FormField>
            </div>

            <FormField label="Duration (months)">
              <input
                className="input font-mono"
                type="number"
                min="1"
                value={form.contract_months}
                onChange={set('contract_months')}
                placeholder="Auto-computed from start/end"
              />
              {form.contract_start && form.contract_end && form.contract_months && (
                <p className="mt-1 text-xs" style={{ color: 'var(--gray-400)' }}>
                  Computed: {form.contract_months} month{Number(form.contract_months) !== 1 ? 's' : ''}
                </p>
              )}
            </FormField>

            {/* Contract file upload */}
            <FormField label="Contract File (PDF / DOC)">
              <div
                className="rounded-md p-4 text-center cursor-pointer"
                style={{
                  border: '2px dashed var(--gray-300)',
                  background: contractFile ? 'var(--navy-50)' : 'var(--gray-50)',
                  color: 'var(--gray-500)',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onClick={() => fileRef.current?.click()}
              >
                {contractFile ? (
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--navy-700)' }}>
                      {contractFile.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--gray-400)' }}>
                      {(contractFile.size / 1024).toFixed(1)} KB · Click to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm">Click to upload contract file</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--gray-400)' }}>
                      PDF, DOC, DOCX — uploaded after employee is saved
                    </p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: 'none' }}
                  onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </FormField>

            {/* Existing contract file link */}
            {isEdit && employee?.contract_file && !contractFile && (
              <div
                className="rounded-md px-4 py-3 flex items-center justify-between text-sm"
                style={{ background: 'var(--navy-50)', border: '1px solid var(--navy-200)' }}
              >
                <div>
                  <p className="font-medium" style={{ color: 'var(--navy-800)' }}>Current contract file</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--navy-500)' }}>
                    {employee.contract_file.split('/').pop()}
                  </p>
                </div>
                <a
                  href={`/uploads/${employee.contract_file.replace(/^uploads\//, '')}`}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="btn-sm btn-secondary text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  Download
                </a>
              </div>
            )}

            {contractUploading && (
              <div
                className="rounded-md px-4 py-3 text-sm flex items-center gap-2"
                style={{ background: 'var(--navy-50)', color: 'var(--navy-700)' }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                  style={{ borderColor: 'var(--navy-500)', borderTopColor: 'transparent' }}
                />
                Uploading contract file…
              </div>
            )}
          </div>
        </TabPanel>

        {/* ── Tab: Payroll ──────────────────────────────────────────────────── */}
        <TabPanel active={tab === 'Payroll'}>
          <div className="space-y-4">
            <div
              className="rounded-md px-4 py-3 text-sm mb-2"
              style={{ background: 'var(--warning-50)', color: 'var(--warning-700)',
                       border: '1px solid var(--warning-200)' }}
            >
              Payroll information is sensitive. Only share with authorized personnel.
            </div>

            <FormField label="Bank Name">
              <input
                className="input"
                value={form.bank_name}
                onChange={set('bank_name')}
                placeholder="BCA / Mandiri / BNI / BRI / etc."
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Account Number">
                <input
                  className="input font-mono"
                  value={form.bank_account_no}
                  onChange={set('bank_account_no')}
                  placeholder="1234567890"
                />
              </FormField>
              <FormField label="Account Name">
                <input
                  className="input"
                  value={form.bank_account_name}
                  onChange={set('bank_account_name')}
                  placeholder="As printed on passbook"
                />
              </FormField>
            </div>

            <div
              className="rounded-md px-4 py-3 text-sm"
              style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                       color: 'var(--gray-600)' }}
            >
              <p className="font-medium mb-1" style={{ color: 'var(--gray-700)' }}>Salary</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--gray-500)' }}>Grade</p>
                  <p className="font-mono text-sm" style={{ color: 'var(--gray-800)' }}>
                    {form.salary_grade || <span style={{ color: 'var(--gray-300)' }}>—</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--gray-500)' }}>Basic Salary</p>
                  <p className="font-mono text-sm" style={{ color: 'var(--gray-800)' }}>
                    {form.basic_salary
                      ? 'IDR ' + Number(form.basic_salary).toLocaleString('id-ID')
                      : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                  </p>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--gray-400)' }}>
                Edit salary grade and basic salary in the Employment tab.
              </p>
            </div>
          </div>
        </TabPanel>

        {/* ── Footer actions ────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between gap-3 pt-5 mt-5"
          style={{ borderTop: '1px solid var(--gray-200)' }}
        >
          {/* Tab navigation helper */}
          <div className="flex gap-1">
            {TABS.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                title={t}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: tab === t ? 'var(--navy-500)' : 'var(--gray-300)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {/* Prev / Next tab helpers */}
            {TABS.indexOf(tab) > 0 && (
              <button
                type="button"
                className="btn-md btn-ghost text-xs"
                onClick={() => setTab(TABS[TABS.indexOf(tab) - 1])}
                disabled={isPending}
              >
                ← {TABS[TABS.indexOf(tab) - 1]}
              </button>
            )}
            {TABS.indexOf(tab) < TABS.length - 1 && (
              <button
                type="button"
                className="btn-md btn-secondary text-xs"
                onClick={() => setTab(TABS[TABS.indexOf(tab) + 1])}
                disabled={isPending}
              >
                {TABS[TABS.indexOf(tab) + 1]} →
              </button>
            )}

            <button
              type="button"
              className="btn-md btn-secondary"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-md btn-primary"
              disabled={isPending}
            >
              {isPending
                ? contractUploading ? 'Uploading…' : 'Saving…'
                : isEdit ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
