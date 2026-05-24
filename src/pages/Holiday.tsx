import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { holidaysApi } from '@/api/client'
import { useMenus } from '@/context/MenuContext'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import FormField from '@/components/FormField'

const COMPANY_ID = 1

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface Holiday {
  id: number
  company_id: number
  date: string
  name: string
  type: 'national' | 'company'
}

function typeLabel(type: string) {
  return type === 'national' ? 'National' : 'Company'
}

function typeBadge(type: string) {
  return type === 'national'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-amber-100 text-amber-700'
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function Spinner() {
  return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--navy-500)' }} /></div>
}

export default function Holiday() {
  const qc = useQueryClient()
  const { can, isUnrestricted } = useMenus()
  const canCreate = isUnrestricted || can('holidays', 'create')
  const canDelete = isUnrestricted || can('holidays', 'delete')

  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [modalOpen, setModalOpen]   = useState(false)
  const [deleting, setDeleting]     = useState<Holiday | null>(null)

  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ['holidays', COMPANY_ID, year, month],
    queryFn:  () => holidaysApi.list(COMPANY_ID, year, month),
  })

  const createMutation = useMutation({
    mutationFn: (d: object) => holidaysApi.create(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['holidays'] }); setModalOpen(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => holidaysApi.delete(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['holidays'] }); setDeleting(null) },
  })

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy-900)', fontFamily: 'Montserrat' }}>
            Holiday Calendar
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            Manage national and company holidays
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--navy-500)', fontFamily: 'Montserrat' }}
          >
            + Add Holiday
          </button>
        )}
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-4">
        <button
          onClick={prevMonth}
          className="px-3 py-1.5 rounded-md text-sm border transition-colors hover:bg-gray-50"
          style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-600)' }}
        >
          ← Prev
        </button>
        <h2 className="text-lg font-semibold min-w-[160px] text-center" style={{ color: 'var(--navy-800)', fontFamily: 'Montserrat' }}>
          {MONTHS[month - 1]} {year}
        </h2>
        <button
          onClick={nextMonth}
          className="px-3 py-1.5 rounded-md text-sm border transition-colors hover:bg-gray-50"
          style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-600)' }}
        >
          Next →
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--gray-200)' }}>
        {isLoading ? <Spinner /> : holidays.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🗓️</p>
            <p className="font-medium" style={{ color: 'var(--gray-500)' }}>No holidays in {MONTHS[month - 1]} {year}</p>
            {canCreate && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-3 text-sm font-medium"
                style={{ color: 'var(--navy-500)' }}
              >
                Add one →
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
                <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--gray-500)' }}>Date</th>
                <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--gray-500)' }}>Name</th>
                <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--gray-500)' }}>Type</th>
                {canDelete && <th className="px-6 py-3" />}
              </tr>
            </thead>
            <tbody>
              {holidays.map((h, i) => (
                <tr
                  key={h.id}
                  style={{ borderTop: i > 0 ? '1px solid var(--gray-100)' : undefined }}
                >
                  <td className="px-6 py-3.5 font-medium" style={{ color: 'var(--gray-800)' }}>
                    {fmtDate(h.date)}
                  </td>
                  <td className="px-6 py-3.5" style={{ color: 'var(--gray-700)' }}>{h.name}</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadge(h.type)}`}>
                      {typeLabel(h.type)}
                    </span>
                  </td>
                  {canDelete && (
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => setDeleting(h)}
                        className="text-xs font-medium transition-colors"
                        style={{ color: 'var(--danger-600)' }}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      <CreateHolidayModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(d) => createMutation.mutate({ ...d, company_id: COMPANY_ID })}
        saving={createMutation.isPending}
        error={createMutation.isError ? 'Failed to save holiday.' : null}
        defaultYear={year}
        defaultMonth={month}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete Holiday"
        message={`Remove "${deleting?.name}" from the calendar?`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

function CreateHolidayModal({
  open, onClose, onSubmit, saving, error, defaultYear, defaultMonth,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (d: { date: string; name: string; type: string }) => void
  saving: boolean
  error: string | null
  defaultYear: number
  defaultMonth: number
}) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const defaultDate = `${defaultYear}-${pad(defaultMonth)}-01`
  const [date, setDate] = useState(defaultDate)
  const [name, setName] = useState('')
  const [type, setType] = useState<'national' | 'company'>('national')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !name.trim()) return
    onSubmit({ date, name: name.trim(), type })
  }

  const resetAndClose = () => {
    setDate(defaultDate)
    setName('')
    setType('national')
    onClose()
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="Add Holiday">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Date" required>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
            style={{ borderColor: 'var(--gray-300)', color: 'var(--gray-900)' }}
            required
          />
        </FormField>

        <FormField label="Name" required>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Independence Day"
            className="w-full border rounded-md px-3 py-2 text-sm"
            style={{ borderColor: 'var(--gray-300)', color: 'var(--gray-900)' }}
            required
          />
        </FormField>

        <FormField label="Type" required>
          <select
            value={type}
            onChange={e => setType(e.target.value as 'national' | 'company')}
            className="w-full border rounded-md px-3 py-2 text-sm"
            style={{ borderColor: 'var(--gray-300)', color: 'var(--gray-900)' }}
          >
            <option value="national">National</option>
            <option value="company">Company</option>
          </select>
        </FormField>

        {error && <p className="text-sm" style={{ color: 'var(--danger-600)' }}>{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={resetAndClose}
            className="px-4 py-2 rounded-md text-sm border"
            style={{ borderColor: 'var(--gray-300)', color: 'var(--gray-600)' }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--navy-500)' }}>
            {saving ? 'Saving…' : 'Add Holiday'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
