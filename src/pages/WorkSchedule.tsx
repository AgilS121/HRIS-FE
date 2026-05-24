import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleApi } from '@/api/client'
import Modal from '@/components/Modal'
import FormField from '@/components/FormField'
import ConfirmDialog from '@/components/ConfirmDialog'

const COMPANY_ID = 1

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkSchedule {
  id:                   number
  company_id:           number
  name:                 string
  work_start:           string
  work_end:             string
  grace_period_minutes: number
  is_default:           boolean
  is_active:            boolean
  office_lat:           number | null
  office_lng:           number | null
  geofence_radius:      number
}

interface LateRule {
  id:               number
  company_id:       number
  min_minutes:      number
  max_minutes:      number | null
  deduction_type:   'fixed' | 'percentage'
  deduction_amount: number
  description:      string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function Spinner() {
  return (
    <div className="px-5 py-12 flex justify-center">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
           style={{ borderColor: 'var(--navy-500)', borderTopColor: 'transparent' }} />
    </div>
  )
}

// ─── Work Schedule Modal ──────────────────────────────────────────────────────

interface SchedForm {
  name: string; work_start: string; work_end: string
  grace_period_minutes: string; is_default: boolean
  office_lat: string; office_lng: string; geofence_radius: string
}
const emptySched = (): SchedForm => ({
  name: '', work_start: '08:00', work_end: '17:00',
  grace_period_minutes: '15', is_default: false,
  office_lat: '', office_lng: '', geofence_radius: '0',
})

function ScheduleModal({ open, onClose, editing }: {
  open: boolean; onClose: () => void; editing: WorkSchedule | null
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<SchedForm>(emptySched())
  const [error, setError] = useState('')

  useMemo(() => {
    if (editing) {
      setForm({
        name:                 editing.name,
        work_start:           editing.work_start.slice(0, 5),
        work_end:             editing.work_end.slice(0, 5),
        grace_period_minutes: String(editing.grace_period_minutes),
        is_default:           editing.is_default,
        office_lat:           editing.office_lat != null ? String(editing.office_lat) : '',
        office_lng:           editing.office_lng != null ? String(editing.office_lng) : '',
        geofence_radius:      String(editing.geofence_radius ?? 0),
      })
    } else {
      setForm(emptySched())
    }
    setError('')
  }, [editing, open])

  const set = (k: keyof SchedForm, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: (d: object) =>
      editing ? scheduleApi.updateSchedule(editing.id, d) : scheduleApi.createSchedule(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-schedules'] }); onClose() },
    onError:   () => setError('Failed to save.'),
  })

  const submit = () => {
    if (!form.name.trim() || !form.work_start || !form.work_end) {
      setError('Name, work start and work end are required.')
      return
    }
    mutation.mutate({
      company_id:           COMPANY_ID,
      name:                 form.name.trim(),
      work_start:           form.work_start,
      work_end:             form.work_end,
      grace_period_minutes: Number(form.grace_period_minutes) || 15,
      is_default:           form.is_default,
      office_lat:           form.office_lat.trim() ? Number(form.office_lat) : null,
      office_lng:           form.office_lng.trim() ? Number(form.office_lng) : null,
      geofence_radius:      Number(form.geofence_radius) || 0,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Work Schedule' : 'Add Work Schedule'} width="max-w-lg">
      <div className="space-y-4">
        <FormField label="Name" required>
          <input className="input w-full" value={form.name} onChange={e => set('name', e.target.value)}
                 placeholder="Standard, Shift Pagi, Shift Malam…" />
        </FormField>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Work Start" required>
            <input className="input w-full" type="time" value={form.work_start}
                   onChange={e => set('work_start', e.target.value)} />
          </FormField>
          <FormField label="Work End" required>
            <input className="input w-full" type="time" value={form.work_end}
                   onChange={e => set('work_end', e.target.value)} />
          </FormField>
          <FormField label="Grace Period (min)">
            <input className="input w-full" type="number" min={0} value={form.grace_period_minutes}
                   onChange={e => set('grace_period_minutes', e.target.value)} />
          </FormField>
        </div>

        <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gray-500)' }}>
            Geofencing (optional)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Office Latitude">
              <input className="input w-full font-mono" value={form.office_lat}
                     onChange={e => set('office_lat', e.target.value)} placeholder="-6.2088" />
            </FormField>
            <FormField label="Office Longitude">
              <input className="input w-full font-mono" value={form.office_lng}
                     onChange={e => set('office_lng', e.target.value)} placeholder="106.8456" />
            </FormField>
          </div>
          <FormField label="Allowed Radius (meters — 0 = disabled)">
            <input className="input w-full" type="number" min={0} value={form.geofence_radius}
                   onChange={e => set('geofence_radius', e.target.value)} placeholder="100" />
          </FormField>
          <p className="text-xs" style={{ color: 'var(--gray-400)' }}>
            Karyawan wajib berada dalam radius ini saat clock-in. Isi lat/lng dari Google Maps.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--gray-700)' }}>
          <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: 'var(--navy-500)' }}
                 checked={form.is_default} onChange={e => set('is_default', e.target.checked)} />
          Set as default schedule for this company
        </label>

        {error && <p className="text-xs" style={{ color: 'var(--danger-600)' }}>{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-md btn-secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button className="btn-md btn-primary" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Schedule'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Late Rule Modal ──────────────────────────────────────────────────────────

interface RuleForm {
  min_minutes: string; max_minutes: string
  deduction_type: 'fixed' | 'percentage'; deduction_amount: string; description: string
}
const emptyRule = (): RuleForm => ({
  min_minutes: '', max_minutes: '', deduction_type: 'fixed', deduction_amount: '0', description: '',
})

function LateRuleModal({ open, onClose, editing }: {
  open: boolean; onClose: () => void; editing: LateRule | null
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<RuleForm>(emptyRule())
  const [error, setError] = useState('')

  useMemo(() => {
    if (editing) {
      setForm({
        min_minutes:      String(editing.min_minutes),
        max_minutes:      editing.max_minutes != null ? String(editing.max_minutes) : '',
        deduction_type:   editing.deduction_type,
        deduction_amount: String(editing.deduction_amount),
        description:      editing.description ?? '',
      })
    } else {
      setForm(emptyRule())
    }
    setError('')
  }, [editing, open])

  const set = (k: keyof RuleForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: (d: object) =>
      editing ? scheduleApi.updateLateRule(editing.id, d) : scheduleApi.createLateRule(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['late-rules'] }); onClose() },
    onError:   () => setError('Failed to save.'),
  })

  const submit = () => {
    if (!form.min_minutes) { setError('Min minutes is required.'); return }
    mutation.mutate({
      company_id:       COMPANY_ID,
      min_minutes:      Number(form.min_minutes),
      max_minutes:      form.max_minutes.trim() ? Number(form.max_minutes) : null,
      deduction_type:   form.deduction_type,
      deduction_amount: Number(form.deduction_amount) || 0,
      description:      form.description.trim() || null,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Late Rule' : 'Add Late Rule'} width="max-w-sm">
      <div className="space-y-4">
        <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--navy-50)', color: 'var(--navy-700)' }}>
          Aturan berlaku jika <b>min_minutes ≤ telat &lt; max_minutes</b>. Kosongkan max untuk "tidak ada batas atas".
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Min (menit telat)" required>
            <input className="input w-full" type="number" min={0} value={form.min_minutes}
                   onChange={e => set('min_minutes', e.target.value)} placeholder="1" />
          </FormField>
          <FormField label="Max (menit telat)">
            <input className="input w-full" type="number" min={0} value={form.max_minutes}
                   onChange={e => set('max_minutes', e.target.value)} placeholder="∞" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tipe Potongan">
            <select className="input w-full" value={form.deduction_type}
                    onChange={e => set('deduction_type', e.target.value)}>
              <option value="fixed">Fixed (Rp)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </FormField>
          <FormField label={form.deduction_type === 'fixed' ? 'Jumlah (Rp)' : 'Persentase (%)'}>
            <input className="input w-full" type="number" min={0} step="0.01" value={form.deduction_amount}
                   onChange={e => set('deduction_amount', e.target.value)} />
          </FormField>
        </div>
        <FormField label="Keterangan">
          <input className="input w-full" value={form.description}
                 onChange={e => set('description', e.target.value)}
                 placeholder="misal: Terlambat 1–30 menit" />
        </FormField>
        {error && <p className="text-xs" style={{ color: 'var(--danger-600)' }}>{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-md btn-secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button className="btn-md btn-primary" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Rule'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'schedules' | 'late-rules'

export default function WorkSchedule() {
  const qc = useQueryClient()
  const [tab, setTab]         = useState<Tab>('schedules')
  const [schedModal, setSchedModal] = useState(false)
  const [ruleModal, setRuleModal]   = useState(false)
  const [editingSched, setEditingSched] = useState<WorkSchedule | null>(null)
  const [editingRule, setEditingRule]   = useState<LateRule | null>(null)
  const [deletingSched, setDeletingSched] = useState<WorkSchedule | null>(null)
  const [deletingRule, setDeletingRule]   = useState<LateRule | null>(null)

  const { data: schedules = [], isLoading: schedLoading } = useQuery<WorkSchedule[]>({
    queryKey: ['work-schedules', COMPANY_ID],
    queryFn:  () => scheduleApi.schedules(COMPANY_ID),
  })
  const { data: lateRules = [], isLoading: rulesLoading } = useQuery<LateRule[]>({
    queryKey: ['late-rules', COMPANY_ID],
    queryFn:  () => scheduleApi.lateRules(COMPANY_ID),
  })

  const deleteSchedMutation = useMutation({
    mutationFn: (id: number) => scheduleApi.deleteSchedule(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['work-schedules'] }); setDeletingSched(null) },
  })
  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) => scheduleApi.deleteLateRule(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['late-rules'] }); setDeletingRule(null) },
  })

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
          Work Schedules
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
          Manage office hours, geofencing radius, and late deduction rules
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--gray-100)' }}>
        {([
          { key: 'schedules',  label: 'Work Schedules' },
          { key: 'late-rules', label: 'Late Deduction Rules' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? '#fff' : 'transparent',
              color:      tab === t.key ? 'var(--navy-600)' : 'var(--gray-500)',
              boxShadow:  tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Schedules Tab ──────────────────────────────────────────────────── */}
      {tab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-md btn-primary" onClick={() => { setEditingSched(null); setSchedModal(true) }}>
              + Add Schedule
            </button>
          </div>
          <div className="card overflow-hidden">
            {schedLoading ? <Spinner /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                      {['Name', 'Hours', 'Grace Period', 'Geofencing', 'Default', ''].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                            style={{ color: 'var(--gray-500)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s, i) => (
                      <tr key={s.id}
                          style={{ borderBottom: i < schedules.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--gray-900)' }}>{s.name}</td>
                        <td className="px-5 py-3.5 font-mono text-xs" style={{ color: 'var(--navy-600)' }}>
                          {s.work_start.slice(0, 5)} – {s.work_end.slice(0, 5)}
                        </td>
                        <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--gray-600)' }}>
                          {s.grace_period_minutes} min
                        </td>
                        <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--gray-600)' }}>
                          {s.geofence_radius > 0 && s.office_lat
                            ? <span className="badge-green">{s.geofence_radius}m radius</span>
                            : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          {s.is_default
                            ? <span className="badge-blue text-xs">Default</span>
                            : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1 justify-end">
                            <button className="btn-sm btn-ghost text-xs"
                                    onClick={() => { setEditingSched(s); setSchedModal(true) }}>Edit</button>
                            <button className="btn-sm text-xs px-2 py-1 rounded-md transition-colors"
                                    style={{ color: 'var(--danger-600)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-50)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                                    onClick={() => setDeletingSched(s)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {schedules.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--gray-400)' }}>
                        No work schedules configured yet.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Late Rules Tab ─────────────────────────────────────────────────── */}
      {tab === 'late-rules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-md btn-primary" onClick={() => { setEditingRule(null); setRuleModal(true) }}>
              + Add Rule
            </button>
          </div>
          <div className="card overflow-hidden">
            {rulesLoading ? <Spinner /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                      {['Range (menit telat)', 'Tipe Potongan', 'Jumlah/Rate', 'Keterangan', ''].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                            style={{ color: 'var(--gray-500)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lateRules.map((r, i) => (
                      <tr key={r.id}
                          style={{ borderBottom: i < lateRules.length - 1 ? '1px solid var(--gray-100)' : undefined }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td className="px-5 py-3.5 font-mono text-xs" style={{ color: 'var(--navy-700)' }}>
                          {r.min_minutes} – {r.max_minutes != null ? r.max_minutes : '∞'} menit
                        </td>
                        <td className="px-5 py-3.5 text-xs capitalize" style={{ color: 'var(--gray-600)' }}>
                          {r.deduction_type}
                        </td>
                        <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--danger-600)' }}>
                          {r.deduction_type === 'fixed'
                            ? fmtMoney(r.deduction_amount)
                            : `${r.deduction_amount}%`}
                        </td>
                        <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--gray-500)' }}>
                          {r.description ?? '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1 justify-end">
                            <button className="btn-sm btn-ghost text-xs"
                                    onClick={() => { setEditingRule(r); setRuleModal(true) }}>Edit</button>
                            <button className="btn-sm text-xs px-2 py-1 rounded-md transition-colors"
                                    style={{ color: 'var(--danger-600)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-50)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                                    onClick={() => setDeletingRule(r)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {lateRules.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--gray-400)' }}>
                        No late deduction rules configured yet.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <ScheduleModal open={schedModal} onClose={() => setSchedModal(false)} editing={editingSched} />
      <LateRuleModal open={ruleModal}  onClose={() => setRuleModal(false)}  editing={editingRule} />

      <ConfirmDialog
        open={!!deletingSched} onClose={() => setDeletingSched(null)}
        onConfirm={() => deletingSched && deleteSchedMutation.mutate(deletingSched.id)}
        title="Delete Work Schedule"
        message={`Delete schedule "${deletingSched?.name}"?`}
        confirmLabel="Delete" danger loading={deleteSchedMutation.isPending}
      />
      <ConfirmDialog
        open={!!deletingRule} onClose={() => setDeletingRule(null)}
        onConfirm={() => deletingRule && deleteRuleMutation.mutate(deletingRule.id)}
        title="Delete Late Rule"
        message={`Delete rule ${deletingRule?.min_minutes}–${deletingRule?.max_minutes ?? '∞'} min?`}
        confirmLabel="Delete" danger loading={deleteRuleMutation.isPending}
      />
    </div>
  )
}
