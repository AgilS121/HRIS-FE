import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi, payrollApi } from '@/api/client'

const COMPANY_ID = 1

const ACTION_BADGE: Record<string, string> = {
  create:    'badge-green',
  update:    'badge-navy',
  terminate: 'badge-red',
  lock:      'badge-yellow',
  paid:      'badge-green',
}

function fmt(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AuditLog() {
  const [limit, setLimit] = useState(100)

  const { data = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['audit-logs', COMPANY_ID, limit],
    queryFn: () => auditApi.list(COMPANY_ID, limit),
  })

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            Audit Log
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            Track sensitive changes to employee and payroll records
          </p>
        </div>
        <button className="btn-md btn-secondary" onClick={() => refetch()}>
          Refresh
        </button>
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between gap-3"
             style={{ borderBottom: '1px solid var(--gray-200)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
            {isLoading ? 'Loading…' : `${data.length} entries`}
          </p>
          <select
            className="input text-xs py-1"
            style={{ width: 120 }}
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
          >
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
          </select>
        </div>

        {isError ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--danger-600)' }}>
            Failed to load audit log.
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
                  {['When', 'Action', 'Type', 'Note', 'By'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((log: any, i: number) => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: i < data.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                      {fmt(log.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={ACTION_BADGE[log.action] ?? 'badge-gray'}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--gray-600)' }}>
                      {log.entity_type}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--gray-700)' }}>
                      {log.note ?? <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--gray-500)' }}>
                      {log.user_name ?? <span style={{ color: 'var(--gray-300)' }}>system</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && !isLoading && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--gray-400)' }}>No audit entries yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
