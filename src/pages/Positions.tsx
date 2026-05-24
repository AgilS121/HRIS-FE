import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { positionsApi } from '@/api/client'
import { useMenus } from '@/context/MenuContext'
import Modal from '@/components/Modal'
import FormField from '@/components/FormField'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Position {
  id: number
  company_id: number
  code: string
  name: string
  description: string | null
}

interface PositionForm {
  code: string
  name: string
  description: string
}

interface FormErrors {
  code?: string
  name?: string
}

const COMPANY_ID = 1

const EMPTY_FORM: PositionForm = { code: '', name: '', description: '' }

export default function Positions() {
  const qc = useQueryClient()
  const { can } = useMenus()

  const [search, setSearch]     = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState<Position | null>(null)
  const [deleting, setDeleting] = useState<Position | null>(null)
  const [form, setForm]         = useState<PositionForm>(EMPTY_FORM)
  const [errors, setErrors]     = useState<FormErrors>({})
  const [saving, setSaving]     = useState(false)

  const { data, isLoading, isError } = useQuery<Position[]>({
    queryKey: ['positions', COMPANY_ID],
    queryFn:  () => positionsApi.list(COMPANY_ID),
  })

  const createMutation = useMutation({
    mutationFn: (d: object) => positionsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['positions'] })
      closeForm()
    },
    onSettled: () => setSaving(false),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => positionsApi.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['positions'] })
      closeForm()
    },
    onSettled: () => setSaving(false),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => positionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['positions'] })
      setDeleting(null)
    },
  })

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (p: Position) => {
    setEditing(p)
    setForm({ code: p.code, name: p.name, description: p.description ?? '' })
    setErrors({})
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!form.code.trim()) errs.code = 'Code is required'
    if (!form.name.trim()) errs.name = 'Name is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setSaving(true)
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        d: { name: form.name.trim(), description: form.description.trim() || null },
      })
    } else {
      createMutation.mutate({
        company_id: COMPANY_ID,
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
      })
    }
  }

  const filtered = (data ?? []).filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold"
              style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            Positions
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            Manage job positions and titles
          </p>
        </div>
        {can('positions', 'create') && (
          <button className="btn-md btn-primary" onClick={openAdd}>+ Add Position</button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Positions', value: data?.length ?? 0,          color: 'var(--navy-500)' },
          { label: 'Shown',           value: filtered.length,            color: 'var(--success-600)' },
          { label: 'Searching',       value: search ? 'Yes' : 'No',      color: 'var(--warning-600)' },
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
          <p className="text-sm font-medium shrink-0" style={{ color: 'var(--gray-700)' }}>
            {isLoading ? 'Loading…' : `${filtered.length} positions`}
          </p>
          <input
            className="input w-52 text-xs py-1.5"
            placeholder="Search name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isError ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--danger-600)' }}>
            Failed to load positions.
          </div>
        ) : isLoading ? (
          <div className="px-5 py-10 text-center">
            <div
              className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--navy-500)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  {['Name', 'Code', 'Description', ''].map(h => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--gray-500)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(pos => (
                  <tr
                    key={pos.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--gray-100)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ background: 'var(--navy-500)', color: '#fff' }}
                        >
                          {pos.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--gray-900)' }}>
                          {pos.name}
                        </span>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-5 py-3.5">
                      <span
                        className="font-mono text-xs px-2 py-1 rounded"
                        style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}
                      >
                        {pos.code}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3.5" style={{ color: 'var(--gray-500)', maxWidth: '280px' }}>
                      {pos.description
                        ? <span className="line-clamp-1">{pos.description}</span>
                        : <span style={{ color: 'var(--gray-300)' }}>—</span>
                      }
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        {can('positions', 'edit') && (
                          <button className="btn-sm btn-ghost text-xs" onClick={() => openEdit(pos)}>
                            Edit
                          </button>
                        )}
                        {can('positions', 'delete') && (
                          <button
                            className="btn-sm text-xs px-2 py-1 rounded-md transition-colors"
                            style={{ color: 'var(--danger-600)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-50)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                            onClick={() => setDeleting(pos)}
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

            {filtered.length === 0 && !isLoading && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm mb-3" style={{ color: 'var(--gray-400)' }}>
                  {search ? 'No positions match your search.' : 'No positions yet.'}
                </p>
                {!search && can('positions', 'create') && (
                  <button className="btn-md btn-primary" onClick={openAdd}>
                    Add first position
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit Position' : 'Add Position'}
        width="max-w-md"
      >
        <div className="space-y-4">
          <FormField label="Code" required error={errors.code}>
            <input
              className="input w-full"
              placeholder="e.g. MGR-01"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })}
              disabled={!!editing}
            />
          </FormField>

          <FormField label="Name" required error={errors.name}>
            <input
              className="input w-full"
              placeholder="e.g. Senior Manager"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </FormField>

          <FormField label="Description">
            <textarea
              className="input w-full resize-none"
              rows={3}
              placeholder="Brief description of this position (optional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-md btn-ghost" onClick={closeForm} disabled={saving}>
              Cancel
            </button>
            <button className="btn-md btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete Position"
        message={`Delete "${deleting?.name}"? This action cannot be undone. Employees assigned to this position will not be affected.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
