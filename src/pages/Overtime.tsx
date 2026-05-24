import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { overtimeApi } from '@/api/client'

const COMPANY_ID = 1

const STATUS_BADGE: Record<string, string> = {
  pending:  'badge-yellow',
  approved: 'badge-green',
  rejected: 'badge-red',
}

const EMPTY_FORM = {
  employee_id:    '',
  date:           '',
  start_time:     '',
  end_time:       '',
  duration_hours: '',
  reason:         '',
}

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Overtime() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState({ ...EMPTY_FORM })
  const [approveId, setApproveId] = useState<number | null>(null)
  const [rejectId, setRejectId]   = useState<number | null>(null)
  const [note, setNote]           = useState('')
  const [statusFilter, setStatus] = useState<string>('all')

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ['overtime', COMPANY_ID],
    queryFn:  () => overtimeApi.list(COMPANY_ID),
  })

  const createMut = useMutation({
    mutationFn: (d: object) => overtimeApi.create(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['overtime'] }); setShowModal(false); setForm({ ...EMPTY_FORM }) },
  })

  const approveMut = useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => overtimeApi.approve(id, note),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['overtime'] }); setApproveId(null); setNote('') },
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => overtimeApi.reject(id, note),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['overtime'] }); setRejectId(null); setNote('') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => overtimeApi.cancel(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['overtime'] }),
  })

  function handleSubmit() {
    if (!form.employee_id || !form.date || !form.start_time || !form.end_time || !form.duration_hours) return
    createMut.mutate({
      employee_id:    Number(form.employee_id),
      date:           form.date,
      start_time:     form.start_time,
      end_time:       form.end_time,
      duration_hours: Number(form.duration_hours),
      reason:         form.reason || undefined,
    })
  }

  const rows = statusFilter === 'all' ? data : data.filter(r => r.status === statusFilter)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            Overtime Requests
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            Submit and manage employee overtime
          </p>
        </div>
        <button className="btn-md btn-primary" onClick={() => setShowModal(true)}>
          + New Request
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            className={`btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatus(s)}
            style={{ textTransform: 'capitalize' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-10 text-center">
            <div className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                 style={{ borderColor: 'var(--navy-500)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  {['Employee', 'Date', 'Time', 'Hours', 'Reason', 'Status', 'Approved By', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm" style={{ color: 'var(--gray-800)' }}>{r.employee_name}</div>
                      <div className="text-xs" style={{ color: 'var(--gray-400)' }}>{r.employee_no}</div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--gray-700)' }}>{fmt(r.date)}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--gray-600)' }}>
                      {r.start_time} – {r.end_time}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--navy-700)' }}>
                      {r.duration_hours}h
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--gray-600)', maxWidth: 180 }}>
                      {r.reason ?? <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={STATUS_BADGE[r.status] ?? 'badge-gray'}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gray-500)' }}>
                      {r.approved_by_name ?? <span style={{ color: 'var(--gray-300)' }}>—</span>}
                      {r.note && <div style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>{r.note}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button className="btn-sm btn-primary" onClick={() => { setApproveId(r.id); setNote('') }}>
                            Approve
                          </button>
                          <button className="btn-sm btn-danger" onClick={() => { setRejectId(r.id); setNote('') }}>
                            Reject
                          </button>
                          <button className="btn-sm btn-secondary" onClick={() => deleteMut.mutate(r.id)}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--gray-400)' }}>No overtime requests.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Overtime Request</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body space-y-3">
              <div>
                <label className="form-label">Employee ID</label>
                <input className="input" type="number" value={form.employee_id}
                  onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                  placeholder="Employee ID" />
              </div>
              <div>
                <label className="form-label">Date</label>
                <input className="input" type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Start Time</label>
                  <input className="input" type="time" value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">End Time</label>
                  <input className="input" type="time" value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Duration (hours)</label>
                <input className="input" type="number" step="0.5" min="0.5" value={form.duration_hours}
                  onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))}
                  placeholder="e.g. 2.5" />
              </div>
              <div>
                <label className="form-label">Reason</label>
                <textarea className="input" rows={2} value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Optional reason..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-md btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-md btn-primary" onClick={handleSubmit} disabled={createMut.isPending}>
                {createMut.isPending ? 'Saving…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveId && (
        <div className="modal-overlay" onClick={() => setApproveId(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Approve Overtime</h2>
              <button className="modal-close" onClick={() => setApproveId(null)}>×</button>
            </div>
            <div className="modal-body">
              <label className="form-label">Note (optional)</label>
              <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Approval note…" />
            </div>
            <div className="modal-footer">
              <button className="btn-md btn-secondary" onClick={() => setApproveId(null)}>Cancel</button>
              <button className="btn-md btn-primary"
                onClick={() => approveMut.mutate({ id: approveId, note: note || undefined })}
                disabled={approveMut.isPending}>
                {approveMut.isPending ? 'Saving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="modal-overlay" onClick={() => setRejectId(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Reject Overtime</h2>
              <button className="modal-close" onClick={() => setRejectId(null)}>×</button>
            </div>
            <div className="modal-body">
              <label className="form-label">Reason for rejection</label>
              <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Required…" />
            </div>
            <div className="modal-footer">
              <button className="btn-md btn-secondary" onClick={() => setRejectId(null)}>Cancel</button>
              <button className="btn-md btn-danger"
                onClick={() => rejectMut.mutate({ id: rejectId, note })}
                disabled={!note || rejectMut.isPending}>
                {rejectMut.isPending ? 'Saving…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
