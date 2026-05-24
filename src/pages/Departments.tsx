import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { departmentsApi } from '@/api/client'
import { useMenus } from '@/context/MenuContext'
import DepartmentForm from './DepartmentForm'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Department {
  id: number
  company_id: number
  name: string
  code: string | null
  parent_id: number | null
  parent_name: string | null
  default_role_id: number | null
  is_active: number
}

const COMPANY_ID = 1

export default function Departments() {
  const qc = useQueryClient()
  const { can } = useMenus()
  const [search, setSearch]       = useState('')
  const [formOpen, setFormOpen]   = useState(false)
  const [editing, setEditing]     = useState<Department | null>(null)
  const [deleting, setDeleting]   = useState<Department | null>(null)

  const { data, isLoading, isError } = useQuery<Department[]>({
    queryKey: ['departments', COMPANY_ID],
    queryFn:  () => departmentsApi.list(COMPANY_ID),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => departmentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      setDeleting(null)
    },
  })

  const openAdd  = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (d: Department) => { setEditing(d); setFormOpen(true) }

  const filtered = (data ?? []).filter(d =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.code ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Build tree: group by parent for display
  const topLevel = filtered.filter(d => !d.parent_id)
  const children = (parentId: number) => filtered.filter(d => d.parent_id === parentId)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            Departments
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            Manage company divisions and sub-departments
          </p>
        </div>
        {can('departments', 'create') && (
          <button className="btn-md btn-primary" onClick={openAdd}>+ Add Department</button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total',      value: data?.length ?? 0,                              color: 'var(--navy-500)' },
          { label: 'Divisions',  value: data?.filter(d => !d.parent_id).length ?? 0,   color: 'var(--success-600)' },
          { label: 'Sub-depts',  value: data?.filter(d => !!d.parent_id).length ?? 0,  color: 'var(--warning-600)' },
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
            {isLoading ? 'Loading…' : `${filtered.length} departments`}
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
            Failed to load departments.
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
                  {['Name', 'Code', 'Type', 'Parent', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Top-level first, then their children indented */}
                {topLevel.map(dept => (
                  <>
                    <DeptRow key={dept.id} dept={dept} indent={false}
                             onEdit={openEdit} onDelete={setDeleting}
                             canEdit={can('departments', 'edit')} canDelete={can('departments', 'delete')} />
                    {children(dept.id).map(sub => (
                      <DeptRow key={sub.id} dept={sub} indent
                               onEdit={openEdit} onDelete={setDeleting}
                               canEdit={can('departments', 'edit')} canDelete={can('departments', 'delete')} />
                    ))}
                  </>
                ))}
                {/* Orphans (parent deleted) */}
                {filtered
                  .filter(d => d.parent_id && !topLevel.find(t => t.id === d.parent_id))
                  .map(dept => (
                    <DeptRow key={dept.id} dept={dept} indent={false}
                             onEdit={openEdit} onDelete={setDeleting}
                             canEdit={can('departments', 'edit')} canDelete={can('departments', 'delete')} />
                  ))}
              </tbody>
            </table>

            {filtered.length === 0 && !isLoading && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm mb-3" style={{ color: 'var(--gray-400)' }}>
                  {search ? 'No departments match your search.' : 'No departments yet.'}
                </p>
                {!search && can('departments', 'create') && (
                  <button className="btn-md btn-primary" onClick={openAdd}>Add first department</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <DepartmentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        department={editing}
        companyId={COMPANY_ID}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete Department"
        message={`Delete "${deleting?.name}"? This will also deactivate it. Employees assigned here will not be affected.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function DeptRow({
  dept, indent, onEdit, onDelete, canEdit, canDelete,
}: {
  dept: Department
  indent: boolean
  onEdit: (d: Department) => void
  onDelete: (d: Department) => void
  canEdit: boolean
  canDelete: boolean
}) {
  return (
    <tr
      className="transition-colors"
      style={{ borderBottom: '1px solid var(--gray-100)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Name */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          {indent && (
            <span className="text-gray-300 ml-4 mr-1 text-base leading-none">└</span>
          )}
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold"
            style={indent
              ? { background: 'var(--navy-50)', color: 'var(--navy-500)' }
              : { background: 'var(--navy-500)', color: '#fff' }
            }
          >
            {(dept.code ?? dept.name).charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>
            {dept.name}
          </span>
        </div>
      </td>

      {/* Code */}
      <td className="px-5 py-3.5">
        {dept.code
          ? <span className="font-mono text-xs px-2 py-1 rounded"
                  style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>
              {dept.code}
            </span>
          : <span style={{ color: 'var(--gray-300)' }}>—</span>
        }
      </td>

      {/* Type */}
      <td className="px-5 py-3.5">
        <span className={dept.parent_id ? 'badge-navy' : 'badge-green'}>
          {dept.parent_id ? 'Sub-department' : 'Division'}
        </span>
      </td>

      {/* Parent */}
      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-500)' }}>
        {dept.parent_name ?? <span style={{ color: 'var(--gray-300)' }}>—</span>}
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1 justify-end">
          {canEdit && (
            <button className="btn-sm btn-ghost text-xs" onClick={() => onEdit(dept)}>Edit</button>
          )}
          {canDelete && (
            <button
              className="btn-sm text-xs px-2 py-1 rounded-md transition-colors"
              style={{ color: 'var(--danger-600)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-50)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
              onClick={() => onDelete(dept)}
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
