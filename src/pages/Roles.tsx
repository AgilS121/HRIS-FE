import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rolesApi } from '@/api/client'
import { useMenus } from '@/context/MenuContext'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import FormField from '@/components/FormField'

interface Role { id: number; name: string; description: string | null; menu_count: number }
interface MenuRow { menu_key: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }

const COMPANY_ID = 1

const MENU_LABELS: Record<string, string> = {
  employees:   'Employees',
  departments: 'Departments',
  positions:   'Positions',
  attendance:  'Attendance',
  leave:       'Leave',
  roles:       'Roles & Permissions',
  users:       'Users',
}
const ALL_MENU_KEYS = Object.keys(MENU_LABELS)

const EMPTY_MENUS = (): MenuRow[] =>
  ALL_MENU_KEYS.map(k => ({ menu_key: k, can_view: false, can_create: false, can_edit: false, can_delete: false }))

export default function Roles() {
  const qc = useQueryClient()
  const { can } = useMenus()
  const [formOpen, setFormOpen]   = useState(false)
  const [deleting, setDeleting]   = useState<Role | null>(null)
  const [editRole, setEditRole]   = useState<Role | null>(null)
  const [name, setName]           = useState('')
  const [desc, setDesc]           = useState('')
  const [menuRows, setMenuRows]   = useState<MenuRow[]>(EMPTY_MENUS())
  const [loadingPerms, setLoadingPerms] = useState(false)

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ['roles', COMPANY_ID],
    queryFn:  () => rolesApi.list(COMPANY_ID),
  })

  const mutation = useMutation({
    mutationFn: (d: { name: string; description: string; menus: MenuRow[] }) =>
      editRole
        ? rolesApi.update(editRole.id, { name: d.name, description: d.description, menus: d.menus })
        : rolesApi.create({ company_id: COMPANY_ID, name: d.name, description: d.description, menus: d.menus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setFormOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setDeleting(null)
    },
  })

  const openAdd = () => {
    setEditRole(null)
    setName('')
    setDesc('')
    setMenuRows(EMPTY_MENUS())
    setFormOpen(true)
  }

  const openEdit = async (role: Role) => {
    setEditRole(role)
    setName(role.name)
    setDesc(role.description ?? '')
    setMenuRows(EMPTY_MENUS())
    setFormOpen(true)
    setLoadingPerms(true)
    try {
      const data = await rolesApi.get(role.id)
      const existing: MenuRow[] = data.menus ?? []
      setMenuRows(EMPTY_MENUS().map(row => {
        const found = existing.find((m: MenuRow) => m.menu_key === row.menu_key)
        return found ? { ...row, ...found } : row
      }))
    } finally {
      setLoadingPerms(false)
    }
  }

  const toggle = (menuKey: string, action: keyof Omit<MenuRow, 'menu_key'>) => {
    setMenuRows(rows => rows.map(r => {
      if (r.menu_key !== menuKey) return r
      const updated = { ...r, [action]: !r[action] }
      // can_view must be true if any other permission is true
      if (action !== 'can_view' && updated[action]) updated.can_view = true
      // If can_view turned off, turn off everything else
      if (action === 'can_view' && !updated.can_view) {
        updated.can_create = false; updated.can_edit = false; updated.can_delete = false
      }
      return updated
    }))
  }

  const toggleAll = (action: keyof Omit<MenuRow, 'menu_key'>, value: boolean) => {
    setMenuRows(rows => rows.map(r => {
      const updated = { ...r, [action]: value }
      if (action !== 'can_view' && value) updated.can_view = true
      if (action === 'can_view' && !value) {
        updated.can_create = false; updated.can_edit = false; updated.can_delete = false
      }
      return updated
    }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    mutation.mutate({ name: name.trim(), description: desc.trim(), menus: menuRows })
  }

  const serverErr = (mutation.error as { response?: { data?: { message?: string } } } | null)
    ?.response?.data?.message

  const ACTIONS: { key: keyof Omit<MenuRow,'menu_key'>; label: string }[] = [
    { key: 'can_view',   label: 'View'   },
    { key: 'can_create', label: 'Create' },
    { key: 'can_edit',   label: 'Edit'   },
    { key: 'can_delete', label: 'Delete' },
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            Roles & Permissions
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            Define roles and control which menus each role can access
          </p>
        </div>
        {can('roles', 'create') && (
          <button className="btn-md btn-primary" onClick={openAdd}>+ Add Role</button>
        )}
      </div>

      {/* Roles list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--gray-200)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
            {isLoading ? 'Loading…' : `${roles.length} roles`}
          </p>
        </div>
        {isLoading ? (
          <div className="py-10 text-center">
            <div className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                 style={{ borderColor: 'var(--navy-500)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                {['Role Name', 'Description', 'Menus', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--gray-500)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(roles as Role[]).map((role, i) => (
                <tr key={role.id}
                    style={{ borderBottom: i < roles.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold"
                           style={{ background: 'var(--navy-500)', color: '#fff' }}>
                        {role.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium" style={{ color: 'var(--gray-900)' }}>{role.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5" style={{ color: 'var(--gray-500)' }}>
                    {role.description ?? <span style={{ color: 'var(--gray-300)' }}>—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="badge-navy">{role.menu_count} menus</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 justify-end">
                      {can('roles', 'edit') && (
                        <button className="btn-sm btn-ghost text-xs" onClick={() => openEdit(role)}>
                          Edit Permissions
                        </button>
                      )}
                      {can('roles', 'delete') && (
                        <button className="btn-sm text-xs px-2 py-1 rounded-md transition-colors"
                                style={{ color: 'var(--danger-600)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-50)')}
                                onMouseLeave={e => (e.currentTarget.style.background = '')}
                                onClick={() => setDeleting(role)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-sm"
                        style={{ color: 'var(--gray-400)' }}>
                  No roles yet. <button className="underline" style={{ color: 'var(--navy-500)' }}
                                        onClick={openAdd}>Add first role</button>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)}
             title={editRole ? `Edit Role: ${editRole.name}` : 'Add Role'} width="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          {serverErr && (
            <div className="rounded-md px-4 py-3 text-sm"
                 style={{ background: 'var(--danger-50)', color: 'var(--danger-700)' }}>
              {serverErr}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role Name" required>
              <input className="input" value={name} onChange={e => setName(e.target.value)}
                     placeholder="e.g. HR Manager" autoFocus />
            </FormField>
            <FormField label="Description">
              <input className="input" value={desc} onChange={e => setDesc(e.target.value)}
                     placeholder="Optional description" />
            </FormField>
          </div>

          {/* Permission matrix */}
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--gray-800)' }}>
              Menu Permissions
            </p>
            {loadingPerms ? (
              <div className="py-6 text-center text-sm" style={{ color: 'var(--gray-400)' }}>
                Loading permissions…
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--gray-200)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--gray-50)' }}>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                          style={{ color: 'var(--gray-500)', width: '40%' }}>Menu</th>
                      {ACTIONS.map(a => (
                        <th key={a.key} className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide"
                            style={{ color: 'var(--gray-500)' }}>
                          <div className="flex flex-col items-center gap-1">
                            {a.label}
                            <input type="checkbox"
                                   checked={menuRows.every(r => r[a.key])}
                                   onChange={e => toggleAll(a.key, e.target.checked)}
                                   title={`Toggle all ${a.label}`}
                                   className="cursor-pointer" />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {menuRows.map((row, i) => (
                      <tr key={row.menu_key}
                          style={{ borderTop: '1px solid var(--gray-100)',
                                   background: i % 2 ? 'var(--gray-50)' : '#fff' }}>
                        <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--gray-700)' }}>
                          {MENU_LABELS[row.menu_key] ?? row.menu_key}
                        </td>
                        {ACTIONS.map(a => (
                          <td key={a.key} className="px-2 py-2.5 text-center">
                            <input type="checkbox"
                                   checked={row[a.key]}
                                   onChange={() => toggle(row.menu_key, a.key)}
                                   className="cursor-pointer w-4 h-4 accent-navy-500" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2"
               style={{ borderTop: '1px solid var(--gray-200)' }}>
            <button type="button" className="btn-md btn-secondary"
                    onClick={() => setFormOpen(false)} disabled={mutation.isPending}>
              Cancel
            </button>
            <button type="submit" className="btn-md btn-primary" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? 'Saving…' : editRole ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete Role"
        message={`Delete role "${deleting?.name}"? Users assigned this role will lose their permissions.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
