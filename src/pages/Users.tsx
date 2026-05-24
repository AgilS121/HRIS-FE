import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/client'

interface User {
  id: number
  email: string
  name: string
  is_temp_password: boolean
  temp_until: string | null
  hours_remaining: number | null
  employee_no: string | null
  full_name: string | null
}

function StatusBadge({ user }: { user: User }) {
  if (!user.is_temp_password) {
    return <span className="badge-navy">Permanent</span>
  }
  if ((user.hours_remaining ?? 0) > 0) {
    return <span className="badge-green">Temp Active</span>
  }
  return <span className="badge-red">Temp Expired</span>
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

function ResetModal({
  user,
  onClose,
  onSuccess,
}: {
  user: User
  onClose: () => void
  onSuccess: () => void
}) {
  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirm]     = useState('')
  const [showNew, setShowNew]             = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(user.id, newPassword)
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-md mx-4 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--gray-900)' }}>
              Reset Password
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
              {user.full_name || user.name}
              {user.employee_no ? ` · ${user.employee_no}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none"
            style={{ color: 'var(--gray-400)' }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--gray-700)' }}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className="input w-full pr-10"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: 'var(--gray-400)' }}
                onClick={() => setShowNew(v => !v)}
              >
                {showNew ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--gray-700)' }}>
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className="input w-full pr-10"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={e => setConfirm(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: 'var(--gray-400)' }}
                onClick={() => setShowConfirm(v => !v)}
              >
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs" style={{ color: 'var(--danger-600)' }}>{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="btn-ghost flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Users() {
  const qc = useQueryClient()
  const [extendingId, setExtendingId]       = useState<number | null>(null)
  const [resetTarget, setResetTarget]       = useState<User | null>(null)
  const [successMsg, setSuccessMsg]         = useState('')

  const { data, isLoading, isError } = useQuery<User[]>({
    queryKey: ['all-users'],
    queryFn: () => authApi.allUsers(),
  })

  const extendMutation = useMutation({
    mutationFn: (userId: number) => authApi.extendTemp(userId),
    onMutate: (userId) => setExtendingId(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-users'] }),
    onSettled: () => setExtendingId(null),
  })

  function handleResetSuccess() {
    qc.invalidateQueries({ queryKey: ['all-users'] })
    setSuccessMsg('Password reset successfully')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

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
            Manage employee credentials and access
          </p>
        </div>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'var(--success-50)', border: '1px solid var(--success-600)', color: 'var(--success-700)' }}
        >
          ✓ {successMsg}
        </div>
      )}

      {/* Info banner */}
      <div
        className="rounded-xl px-4 py-3 text-sm flex items-start gap-3"
        style={{ background: 'var(--navy-50)', border: '1px solid var(--navy-500)', borderLeftWidth: '4px' }}
      >
        <span className="text-base mt-0.5 shrink-0">ℹ️</span>
        <p style={{ color: 'var(--navy-900)' }}>
          Temp accounts are auto-created when adding employees (password = employee no, expires 3 days).
          Use <strong>Reset Password</strong> to set a new permanent password for any user.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users',   value: users.length,   color: 'var(--navy-500)' },
          { label: 'Temp Active',   value: activeCount,    color: 'var(--success-600)' },
          { label: 'Temp Expired',  value: expiredCount,   color: 'var(--danger-600)' },
          { label: 'Permanent',     value: permanentCount, color: 'var(--gray-500)' },
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
                  {['User', 'Employee', 'Status', 'Expires', ''].map(h => (
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
                          {(user.full_name || user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" style={{ color: 'var(--gray-900)' }}>
                            {user.full_name || user.name || '—'}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--gray-500)' }}>
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Employee No */}
                    <td className="px-5 py-3.5">
                      {user.employee_no
                        ? <span className="text-xs font-mono font-semibold" style={{ color: 'var(--navy-600)' }}>
                            {user.employee_no}
                          </span>
                        : <span style={{ color: 'var(--gray-300)' }}>—</span>
                      }
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge user={user} />
                    </td>

                    {/* Expires */}
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--gray-500)' }}>
                      {user.is_temp_password ? formatExpiry(user.temp_until) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {user.is_temp_password && (
                          <button
                            className="btn-sm btn-ghost text-xs"
                            onClick={() => extendMutation.mutate(user.id)}
                            disabled={extendingId === user.id}
                          >
                            {extendingId === user.id ? 'Extending…' : 'Extend +1d'}
                          </button>
                        )}
                        <button
                          className="btn-sm btn-ghost text-xs"
                          style={{ color: 'var(--warning-600)' }}
                          onClick={() => setResetTarget(user)}
                        >
                          Reset Password
                        </button>
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

      {/* Reset Password Modal */}
      {resetTarget && (
        <ResetModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={handleResetSuccess}
        />
      )}
    </div>
  )
}
