import { useEffect, useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { departmentsApi, rolesApi } from '@/api/client'
import Modal from '@/components/Modal'
import FormField from '@/components/FormField'

interface Department {
  id: number
  company_id: number
  name: string
  code: string | null
  parent_id: number | null
  default_role_id: number | null
}

interface Props {
  open: boolean
  onClose: () => void
  department?: Department | null
  companyId: number
}

const EMPTY = { name: '', code: '', parent_id: '', default_role_id: '' }

export default function DepartmentForm({ open, onClose, department, companyId }: Props) {
  const qc     = useQueryClient()
  const isEdit = !!department
  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setErrors({})
    setForm(department
      ? {
          name:            department.name,
          code:            department.code ?? '',
          parent_id:       department.parent_id ? String(department.parent_id) : '',
          default_role_id: department.default_role_id ? String(department.default_role_id) : '',
        }
      : EMPTY
    )
  }, [department, open])

  const { data: allDepts = [] } = useQuery<Department[]>({
    queryKey: ['departments', companyId],
    queryFn: () => departmentsApi.list(companyId),
    enabled: open,
  })

  const { data: roles = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['roles', companyId],
    queryFn: () => rolesApi.list(companyId),
    enabled: open,
  })

  // Exclude self and its descendants from parent options
  const parentOptions = (allDepts as Department[]).filter(d => d.id !== department?.id)

  const mutation = useMutation({
    mutationFn: (data: object) =>
      isEdit
        ? departmentsApi.update(department!.id, data)
        : departmentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      onClose()
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Department name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    mutation.mutate({
      company_id:      companyId,
      name:            form.name.trim(),
      code:            form.code.trim() || null,
      parent_id:       form.parent_id       ? Number(form.parent_id)       : null,
      default_role_id: form.default_role_id ? Number(form.default_role_id) : null,
    })
  }

  const serverErr = (mutation.error as { response?: { data?: { message?: string } } } | null)
    ?.response?.data?.message

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Department' : 'Add Department'} width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        {serverErr && (
          <div className="rounded-md px-4 py-3 text-sm"
               style={{ background: 'var(--danger-50)', color: 'var(--danger-700)' }}>
            {serverErr}
          </div>
        )}

        <FormField label="Department Name" required error={errors.name}>
          <input className="input" value={form.name} onChange={set('name')}
                 placeholder="e.g. Information Technology" autoFocus />
        </FormField>

        <FormField label="Code" error={errors.code}>
          <input className="input" value={form.code} onChange={set('code')}
                 placeholder="e.g. IT" maxLength={20} />
        </FormField>

        <FormField label="Parent Department">
          <select className="input" value={form.parent_id} onChange={set('parent_id')}>
            <option value="">— None (top level) —</option>
            {parentOptions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Default Role">
          <select className="input" value={form.default_role_id} onChange={set('default_role_id')}>
            <option value="">— No default role —</option>
            {(roles as { id: number; name: string }[]).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs" style={{ color: 'var(--gray-400)' }}>
            New employees assigned to this department inherit this role by default.
          </p>
        </FormField>

        <div className="flex gap-3 justify-end pt-2"
             style={{ borderTop: '1px solid var(--gray-200)' }}>
          <button type="button" className="btn-md btn-secondary"
                  onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button type="submit" className="btn-md btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Department'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
