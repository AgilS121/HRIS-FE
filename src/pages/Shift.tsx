import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shiftsApi, rostersApi, employeesApi } from '@/api/client'

const COMPANY_ID = 1

function weekDates(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day  = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

const EMPTY_SHIFT = { name: '', start_time: '', end_time: '' }

export default function Shift() {
  const qc  = useQueryClient()
  const [tab, setTab]           = useState<'roster' | 'shifts'>('roster')
  const [weekStart, setWeek]    = useState(() => getMonday(new Date()))
  const [showForm, setShowForm] = useState(false)
  const [editShift, setEdit]    = useState<any | null>(null)
  const [form, setForm]         = useState({ ...EMPTY_SHIFT })
  const [assigning, setAssigning] = useState<{ emp: any; date: string } | null>(null)
  const [selectedShift, setSelectedShift] = useState<string>('')

  const dates     = weekDates(weekStart)
  const dateFrom  = dates[0]
  const dateTo    = dates[6]

  const { data: shifts = [] } = useQuery<any[]>({
    queryKey: ['shifts', COMPANY_ID],
    queryFn:  () => shiftsApi.list(COMPANY_ID),
  })

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['employees', COMPANY_ID],
    queryFn:  () => employeesApi.list(COMPANY_ID),
  })

  const { data: rosters = [] } = useQuery<any[]>({
    queryKey: ['rosters', COMPANY_ID, dateFrom, dateTo],
    queryFn:  () => rostersApi.list(COMPANY_ID, dateFrom, dateTo),
  })

  const rosterMap = useMemo(() => {
    const m: Record<string, Record<string, any>> = {}
    rosters.forEach((r: any) => {
      if (!m[r.employee_id]) m[r.employee_id] = {}
      m[r.employee_id][r.date] = r
    })
    return m
  }, [rosters])

  const createShift = useMutation({
    mutationFn: (d: object) => shiftsApi.create(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['shifts'] }); setShowForm(false); setForm({ ...EMPTY_SHIFT }) },
  })

  const updateShift = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => shiftsApi.update(id, d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['shifts'] }); setEdit(null) },
  })

  const deleteShift = useMutation({
    mutationFn: (id: number) => shiftsApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  })

  const assignRoster = useMutation({
    mutationFn: (d: object) => rostersApi.upsert(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['rosters'] }); setAssigning(null) },
  })

  const removeRoster = useMutation({
    mutationFn: (id: number) => rostersApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['rosters'] }),
  })

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeek(d) }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeek(d) }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            Shifts & Rostering
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            Manage shift templates and weekly roster assignments
          </p>
        </div>
        <div className="flex gap-2">
          <button className={`btn-sm ${tab === 'roster' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('roster')}>
            Roster
          </button>
          <button className={`btn-sm ${tab === 'shifts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('shifts')}>
            Shift Templates
          </button>
        </div>
      </div>

      {tab === 'roster' && (
        <>
          {/* Week nav */}
          <div className="flex items-center gap-3">
            <button className="btn-sm btn-secondary" onClick={prevWeek}>← Prev</button>
            <span className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
              {fmtDate(dateFrom)} — {fmtDate(dateTo)}
            </span>
            <button className="btn-sm btn-secondary" onClick={nextWeek}>Next →</button>
          </div>

          {/* Roster grid */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--gray-500)', minWidth: 160 }}>
                      Employee
                    </th>
                    {dates.map(d => (
                      <th key={d} className="px-3 py-3 text-center text-xs font-semibold"
                          style={{ color: 'var(--gray-500)', minWidth: 110 }}>
                        {fmtDate(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: any, i: number) => (
                    <tr key={emp.id}
                        style={{ borderBottom: i < employees.length - 1 ? '1px solid var(--gray-100)' : undefined }}>
                      <td className="px-4 py-2">
                        <div className="text-sm font-medium" style={{ color: 'var(--gray-800)' }}>{emp.full_name}</div>
                        <div className="text-xs" style={{ color: 'var(--gray-400)' }}>{emp.department_name ?? '—'}</div>
                      </td>
                      {dates.map(date => {
                        const entry = rosterMap[emp.id]?.[date]
                        return (
                          <td key={date} className="px-2 py-2 text-center">
                            {entry ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="badge-navy text-xs">{entry.shift_name}</span>
                                <span className="text-xs" style={{ color: 'var(--gray-400)' }}>
                                  {entry.shift_start?.slice(0, 5)}–{entry.shift_end?.slice(0, 5)}
                                </span>
                                <button
                                  className="text-xs mt-0.5"
                                  style={{ color: 'var(--danger-500)' }}
                                  onClick={() => removeRoster.mutate(entry.id)}
                                >
                                  remove
                                </button>
                              </div>
                            ) : (
                              <button
                                className="text-xs px-2 py-1 rounded"
                                style={{ color: 'var(--gray-400)', border: '1px dashed var(--gray-300)' }}
                                onClick={() => { setAssigning({ emp, date }); setSelectedShift('') }}
                              >
                                + assign
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {employees.length === 0 && (
                <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--gray-400)' }}>
                  No employees found.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'shifts' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between"
               style={{ borderBottom: '1px solid var(--gray-200)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
              {shifts.length} shift template{shifts.length !== 1 ? 's' : ''}
            </p>
            <button className="btn-sm btn-primary" onClick={() => { setShowForm(true); setEdit(null); setForm({ ...EMPTY_SHIFT }) }}>
              + New Shift
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  {['Name', 'Start', 'End', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gray-500)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map((s: any, i: number) => (
                  <tr key={s.id}
                      style={{ borderBottom: i < shifts.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--gray-800)' }}>{s.name}</td>
                    <td className="px-5 py-3 font-mono text-sm" style={{ color: 'var(--gray-600)' }}>{s.start_time}</td>
                    <td className="px-5 py-3 font-mono text-sm" style={{ color: 'var(--gray-600)' }}>{s.end_time}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button className="btn-sm btn-secondary"
                          onClick={() => { setEdit(s); setForm({ name: s.name, start_time: s.start_time, end_time: s.end_time }); setShowForm(false) }}>
                          Edit
                        </button>
                        <button className="btn-sm btn-danger" onClick={() => deleteShift.mutate(s.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shifts.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--gray-400)' }}>No shift templates yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shift form modal (create or edit) */}
      {(showForm || editShift) && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEdit(null) }}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editShift ? 'Edit Shift' : 'New Shift Template'}</h2>
              <button className="modal-close" onClick={() => { setShowForm(false); setEdit(null) }}>×</button>
            </div>
            <div className="modal-body space-y-3">
              <div>
                <label className="form-label">Name</label>
                <input className="input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Morning Shift" />
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
            </div>
            <div className="modal-footer">
              <button className="btn-md btn-secondary" onClick={() => { setShowForm(false); setEdit(null) }}>Cancel</button>
              <button className="btn-md btn-primary"
                disabled={createShift.isPending || updateShift.isPending}
                onClick={() => {
                  if (!form.name || !form.start_time || !form.end_time) return
                  if (editShift) {
                    updateShift.mutate({ id: editShift.id, d: form })
                  } else {
                    createShift.mutate({ company_id: COMPANY_ID, ...form })
                  }
                }}>
                {createShift.isPending || updateShift.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign roster modal */}
      {assigning && (
        <div className="modal-overlay" onClick={() => setAssigning(null)}>
          <div className="modal-content" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Assign Shift</h2>
              <button className="modal-close" onClick={() => setAssigning(null)}>×</button>
            </div>
            <div className="modal-body space-y-3">
              <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                <strong>{assigning.emp.full_name}</strong> on <strong>{fmtDate(assigning.date)}</strong>
              </p>
              <div>
                <label className="form-label">Select Shift</label>
                <select className="input" value={selectedShift} onChange={e => setSelectedShift(e.target.value)}>
                  <option value="">— choose —</option>
                  {shifts.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-md btn-secondary" onClick={() => setAssigning(null)}>Cancel</button>
              <button className="btn-md btn-primary"
                disabled={!selectedShift || assignRoster.isPending}
                onClick={() => assignRoster.mutate({
                  company_id:  COMPANY_ID,
                  employee_id: assigning.emp.id,
                  shift_id:    Number(selectedShift),
                  date:        assigning.date,
                })}>
                {assignRoster.isPending ? 'Saving…' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
