import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesApi } from '@/api/client'
import EmployeeForm from './EmployeeForm'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Employee {
  id: number
  company_id: number
  employee_no: string
  full_name: string
  nickname: string | null
  email: string | null
  phone: string | null
  gender: string
  birth_place: string | null
  birth_date: string | null
  national_id: string | null
  tax_id: string | null
  marital_status: string
  address: string | null
  department_id: number | null
  position_id: number | null
  department_name: string | null
  position_name: string | null
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

const COMPANY_ID = 1

const STATUS_BADGE: Record<string, string> = {
  active:     'badge-green',
  suspended:  'badge-yellow',
  resigned:   'badge-gray',
  terminated: 'badge-red',
}
const TYPE_LABEL: Record<string, string> = {
  permanent: 'Permanent',
  contract:  'Contract',
  intern:    'Intern',
  outsource: 'Outsource',
}

export default function Employees() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [terminating, setTerminating] = useState<Employee | null>(null)

  const { data, isLoading, isError } = useQuery<Employee[]>({
    queryKey: ['employees', COMPANY_ID],
    queryFn: () => employeesApi.list(COMPANY_ID),
  })

  const terminateMutation = useMutation({
    mutationFn: (id: number) => employeesApi.terminate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      setTerminating(null)
    },
  })

  const openAdd  = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (emp: Employee) => { setEditing(emp); setFormOpen(true) }

  const filtered = (data ?? []).filter(e =>
    !search ||
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_no.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:      data?.length ?? 0,
    active:     data?.filter(e => e.status === 'active').length ?? 0,
    terminated: data?.filter(e => e.status === 'terminated').length ?? 0,
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            Employees
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            Manage your workforce and employee records
          </p>
        </div>
        <button className="btn-md btn-primary" onClick={openAdd}>
          + Add Employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: stats.total,      color: 'var(--navy-500)' },
          { label: 'Active',          value: stats.active,     color: 'var(--success-600)' },
          { label: 'On Leave',        value: '—',              color: 'var(--warning-600)' },
          { label: 'Terminated',      value: stats.terminated, color: 'var(--danger-600)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card px-5 py-4">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-500)' }}>{label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Montserrat', color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3.5 flex items-center justify-between gap-3"
             style={{ borderBottom: '1px solid var(--gray-200)' }}>
          <p className="text-sm font-medium shrink-0" style={{ color: 'var(--gray-700)' }}>
            {isLoading ? 'Loading…' : `${filtered.length} employees`}
          </p>
          <input
            className="input w-56 text-xs py-1.5"
            placeholder="Search name or number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* States */}
        {isError ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--danger-600)' }}>
            Failed to load employees.
          </div>
        ) : isLoading ? (
          <div className="px-5 py-10 text-center">
            <div className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                 style={{ borderColor: 'var(--navy-500)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  {['Employee', 'Department', 'Position', 'Type', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <tr
                    key={emp.id}
                    className="transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    {/* Employee */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
                          style={{ background: 'var(--navy-50)', color: 'var(--navy-600)' }}
                        >
                          {emp.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>
                            {emp.full_name}
                          </p>
                          <p className="text-xs font-mono" style={{ color: 'var(--gray-400)' }}>
                            {emp.employee_no}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-600)' }}>
                      {emp.department_name ?? <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-600)' }}>
                      {emp.position_name ?? <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="badge-navy">{TYPE_LABEL[emp.employment_type] ?? emp.employment_type}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={STATUS_BADGE[emp.status] ?? 'badge-gray'}>{emp.status}</span>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          className="btn-sm btn-ghost text-xs"
                          onClick={() => openEdit(emp)}
                        >
                          Edit
                        </button>
                        {emp.status !== 'terminated' && emp.status !== 'resigned' && (
                          <button
                            className="btn-sm text-xs px-2 py-1 rounded-md transition-colors"
                            style={{ color: 'var(--danger-600)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-50)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                            onClick={() => setTerminating(emp)}
                          >
                            Terminate
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
                <p className="text-sm mb-3" style={{ color: 'var(--gray-400)' }}>
                  {search ? 'No employees match your search.' : 'No employees yet.'}
                </p>
                {!search && (
                  <button className="btn-md btn-primary" onClick={openAdd}>
                    Add first employee
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      <EmployeeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        employee={editing}
        companyId={COMPANY_ID}
      />

      {/* Terminate confirm */}
      <ConfirmDialog
        open={!!terminating}
        onClose={() => setTerminating(null)}
        onConfirm={() => terminating && terminateMutation.mutate(terminating.id)}
        title="Terminate Employee"
        message={`Are you sure you want to terminate ${terminating?.full_name}? This action cannot be undone.`}
        confirmLabel="Terminate"
        danger
        loading={terminateMutation.isPending}
      />
    </div>
  )
}
