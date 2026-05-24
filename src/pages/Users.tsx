import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/client'

interface TempUser {
  id: number
  email: string
  name: string
  is_temp_password: boolean
  temp_until: string | null
  hours_remaining: number | null
}

function StatusBadge({ user }: { user: TempUser }) {
  if (!user.is_temp_password) {
    return <span className="badge-navy">Permanent</span>
  }
  if ((user.hours_remaining ?? 0) > 0) {
    return <span className="badge-green">Active</span>
  }
  return <span className="badge-red">Expired</span>
}

function formatExpiry(until: string | null): string {
  if (!until) return '—'
  const d = new Date(until)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export default function Users() {
  const qc = useQueryClient()
  const [extendingId, setExtendingId] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery<TempUser[]>({
    queryKey: ['temp-users'],
    queryFn: () => authApi.tempUsers(),
  })

  const extendMutation = useMutation({
    mutationFn: (userId: number) => authApi.extendTemp(userId),
    onMutate: (userId) => setExtendingId(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['temp-users'] }),
    onSettled: () => setExtendingId(null),
  })

  const users = data ?? []

  const tempCount      = users.filter(u => u.is_temp_password).length
  const activeCount    = users.filter(u => u.is_temp_password && (u.hours_remaining ?? 0) > 0).length
  const expiredCount   = users.filter(u => u.is_temp_password && (u.hours_remaining ?? 0) <= 0).length
  const permanentCount = users.filter(u => !u.is_temp_password).length

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold"
              style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            User Accounts
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            Manage temporary employee credentials
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div
        className="rounded-xl px-4 py-3 text-sm flex items-start gap-3"
        style={{ background: 'var(--navy-50)', border: '1px solid var(--navy-500)', borderLeftWidth: '4px' }}
      >
        <span className="text-base mt-0.5 shrink-0">ℹ️</span>
        <p style={{ color: 'var(--navy-900)' }}>
          Temp accounts are auto-created when adding employees. They expire after 3 days and must be
          changed to a permanent password.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users',       value: users.length,   color: 'var(--navy-500)' },
          { label: 'Temp Active',        value: activeCount,    color: 'var(--success-600)' },
          { label: 'Temp Expired',       value: expiredCount,   color: 'var(--danger-600)' },
          { label: 'Permanent',          value: permanentCount, color: 'var(--gray-500)' },
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
          <p className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
            {isLoading ? 'Loading…' : `${users.length} user${users.length !== 1 ? 's' : ''}`}
          </p>
          <p className="text-xs" style={{ color: 'var(--gray-400)' }}>
            {tempCount} temp · {permanentCount} permanent
          </p>
        </div>

        {isError ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--danger-600)' }}>
            Failed to load users.
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
                  {['User', 'Status', 'Expires', 'Hours Left', ''].map(h => (
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
                {users.map(user => (
                  <tr
                    key={user.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--gray-100)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ background: 'var(--navy-500)', color: '#fff' }}
                        >
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" style={{ color: 'var(--gray-900)' }}>
                            {user.name || '—'}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--gray-500)' }}>
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge user={user} />
                    </td>

                    {/* Expires */}
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--gray-500)' }}>
                      {user.is_temp_password ? formatExpiry(user.temp_until) : '—'}
                    </td>

                    {/* Hours Left */}
                    <td className="px-5 py-3.5">
                      {user.is_temp_password && user.hours_remaining !== null ? (
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: (user.hours_remaining ?? 0) > 0
                              ? 'var(--success-600)'
                              : 'var(--danger-600)',
                          }}
                        >
                          {(user.hours_remaining ?? 0) > 0 ? `${user.hours_remaining}h` : 'Expired'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--gray-300)' }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end">
                        {user.is_temp_password && (
                          <button
                            className="btn-sm btn-ghost text-xs"
                            onClick={() => extendMutation.mutate(user.id)}
                            disabled={extendingId === user.id}
                          >
                            {extendingId === user.id ? 'Extending…' : 'Extend +1d'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && !isLoading && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--gray-400)' }}>
                  No user accounts found.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
