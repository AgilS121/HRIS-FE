import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesApi, departmentsApi, positionsApi } from '@/api/client'
import Modal from '@/components/Modal'
import FormField from '@/components/FormField'

interface Employee {
  id: number
  employee_no: string
  full_name: string
  email: string | null
  phone: string | null
  gender: string
  department_id: number | null
  position_id: number | null
  join_date: string
  employment_type: string
  status: string
}

interface Props {
  open: boolean
  onClose: () => void
  employee?: Employee | null
  companyId: number
}

const EMPTY = {
  employee_no: '', full_name: '', email: '', phone: '',
  gender: 'M', department_id: '', position_id: '',
  join_date: '', employment_type: 'permanent',
}

export default function EmployeeForm({ open, onClose, employee, companyId }: Props) {
  const qc = useQueryClient()
  const isEdit = !!employee

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (employee) {
      setForm({
        employee_no:      employee.employee_no ?? '',
        full_name:        employee.full_name ?? '',
        email:            employee.email ?? '',
        phone:            employee.phone ?? '',
        gender:           employee.gender ?? 'M',
        department_id:    employee.department_id ? String(employee.department_id) : '',
        position_id:      employee.position_id  ? String(employee.position_id)  : '',
        join_date:        employee.join_date ?? '',
        employment_type:  employee.employment_type ?? 'permanent',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [employee, open])

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

  const mutation = useMutation({
    mutationFn: (data: object) =>
      isEdit
        ? employeesApi.update(employee!.id, data)
        : employeesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      onClose()
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.employee_no.trim()) e.employee_no = 'Employee number is required'
    if (!form.full_name.trim())   e.full_name   = 'Full name is required'
    if (!form.join_date)          e.join_date   = 'Join date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    mutation.mutate({
      company_id:      companyId,
      employee_no:     form.employee_no,
      full_name:       form.full_name,
      email:           form.email || null,
      phone:           form.phone || null,
      gender:          form.gender,
      department_id:   form.department_id ? Number(form.department_id) : null,
      position_id:     form.position_id   ? Number(form.position_id)   : null,
      join_date:       form.join_date,
      employment_type: form.employment_type,
    })
  }

  const err = mutation.error as { response?: { data?: { message?: string } } } | null
  const serverErr = err?.response?.data?.message

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Employee' : 'Add Employee'}
      width="max-w-xl"
    >
      <form onSubmit={submit} className="space-y-4">
        {serverErr && (
          <div className="rounded-md px-4 py-3 text-sm"
               style={{ background: 'var(--danger-50)', color: 'var(--danger-700)' }}>
            {serverErr}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Employee No." required error={errors.employee_no}>
            <input className="input" value={form.employee_no} onChange={set('employee_no')}
                   placeholder="EMP-001" />
          </FormField>
          <FormField label="Gender" required>
            <select className="input" value={form.gender} onChange={set('gender')}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </FormField>
        </div>

        <FormField label="Full Name" required error={errors.full_name}>
          <input className="input" value={form.full_name} onChange={set('full_name')}
                 placeholder="John Doe" />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email">
            <input className="input" type="email" value={form.email} onChange={set('email')}
                   placeholder="john@company.com" />
          </FormField>
          <FormField label="Phone">
            <input className="input" value={form.phone} onChange={set('phone')}
                   placeholder="+62 812 ..." />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Department">
            <select className="input" value={form.department_id} onChange={set('department_id')}>
              <option value="">— Select —</option>
              {(departments as { id: number; name: string }[]).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Position">
            <select className="input" value={form.position_id} onChange={set('position_id')}>
              <option value="">— Select —</option>
              {(positions as { id: number; name: string }[]).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Join Date" required error={errors.join_date}>
            <input className="input" type="date" value={form.join_date} onChange={set('join_date')} />
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

        <div className="flex gap-3 justify-end pt-2" style={{ borderTop: '1px solid var(--gray-200)' }}>
          <button type="button" className="btn-md btn-secondary" onClick={onClose}
                  disabled={mutation.isPending}>
            Cancel
          </button>
          <button type="submit" className="btn-md btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Employee'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
