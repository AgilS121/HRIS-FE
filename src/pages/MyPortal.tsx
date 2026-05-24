import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { selfServiceApi, payrollApi } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import Modal from '@/components/Modal'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface MyPayslip {
  id: number
  employee_id: number
  period_year: number
  period_month: number
  run_status: string
  basic_salary: number
  gross_earnings: number
  total_deductions: number
  net_salary: number
  working_days: number
  absent_days: number
  leave_days: number
  prorate_days: number | null
}

interface PayslipItem {
  id: number
  component_name: string
  type: 'earning' | 'deduction'
  amount: number
  note?: string
}

function fmtMoney(v: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v ?? 0)
}

function runStatusBadge(status: string) {
  const map: Record<string, string> = {
    draft:  'bg-gray-100 text-gray-600',
    locked: 'bg-blue-100 text-blue-700',
    paid:   'bg-green-100 text-green-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--navy-500)' }} />
    </div>
  )
}

function PayslipDetailModal({ open, onClose, payslipId }: { open: boolean; onClose: () => void; payslipId: number | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-payslip-detail', payslipId],
    queryFn:  () => payrollApi.payslip(payslipId!),
    enabled:  !!payslipId && open,
  })

  const payslip: (MyPayslip & { employee_name?: string; employee_no?: string; position_name?: string }) | null = data?.payslip ?? null
  const items: PayslipItem[] = data?.items ?? []
  const earnings   = items.filter(i => i.type === 'earning')
  const deductions = items.filter(i => i.type === 'deduction')

  return (
    <Modal open={open} onClose={onClose} title="My Payslip" width="max-w-lg">
      {isLoading ? <Spinner /> : !payslip ? (
        <p className="text-center py-8 text-sm" style={{ color: 'var(--gray-500)' }}>Failed to load payslip.</p>
      ) : (
        <div className="space-y-4 text-sm">
          {/* Header */}
          <div className="rounded-lg px-4 py-3 space-y-1"
               style={{ background: 'var(--navy-50)', borderLeft: '4px solid var(--navy-500)' }}>
            <p className="font-semibold" style={{ color: 'var(--navy-800)', fontFamily: 'Montserrat' }}>
              {payslip.employee_name}
            </p>
            <p className="text-xs" style={{ color: 'var(--navy-600)' }}>
              {payslip.employee_no}
              {payslip.position_name ? ` · ${payslip.position_name}` : ''}
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--navy-500)' }}>
              {MONTHS[(payslip.period_month ?? 1) - 1]} {payslip.period_year}
            </p>
          </div>

          {/* Attendance summary */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Working Days', value: payslip.working_days },
              { label: 'Absent (cut)', value: payslip.absent_days, warn: payslip.absent_days > 0 },
              { label: 'Leave Days',   value: payslip.leave_days },
              ...(payslip.prorate_days != null
                ? [{ label: 'Prorate Days', value: payslip.prorate_days, warn: true }]
                : []),
            ].map(({ label, value, warn }) => (
              <div key={label} className="rounded-md px-3 py-2" style={{ background: 'var(--gray-50)' }}>
                <p className="text-xs" style={{ color: 'var(--gray-500)' }}>{label}</p>
                <p className="text-lg font-bold"
                   style={{ color: warn ? 'var(--warning-600)' : 'var(--gray-800)' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Earnings */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--gray-500)' }}>Earnings</p>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--gray-200)' }}>
              <div className="flex justify-between px-4 py-2.5"
                   style={{ borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ color: 'var(--gray-600)' }}>Basic Salary</span>
                <span className="font-medium" style={{ color: 'var(--gray-900)' }}>{fmtMoney(payslip.basic_salary)}</span>
              </div>
              {earnings.map(item => (
                <div key={item.id} className="flex justify-between px-4 py-2.5"
                     style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <span style={{ color: 'var(--gray-600)' }}>{item.component_name}</span>
                    {item.note && <p className="text-xs" style={{ color: 'var(--gray-400)' }}>{item.note}</p>}
                  </div>
                  <span className="font-medium" style={{ color: 'var(--success-700)' }}>{fmtMoney(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 font-semibold"
                   style={{ background: 'var(--gray-50)' }}>
                <span style={{ color: 'var(--gray-700)' }}>Gross Earnings</span>
                <span style={{ color: 'var(--gray-900)' }}>{fmtMoney(payslip.gross_earnings)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          {deductions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--gray-500)' }}>Deductions</p>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--gray-200)' }}>
                {deductions.map(item => (
                  <div key={item.id} className="flex justify-between px-4 py-2.5"
                       style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <div>
                      <span style={{ color: 'var(--gray-600)' }}>{item.component_name}</span>
                      {item.note && <p className="text-xs" style={{ color: 'var(--gray-400)' }}>{item.note}</p>}
                    </div>
                    <span className="font-medium" style={{ color: 'var(--danger-600)' }}>({fmtMoney(item.amount)})</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 font-semibold" style={{ background: 'var(--gray-50)' }}>
                  <span style={{ color: 'var(--gray-700)' }}>Total Deductions</span>
                  <span style={{ color: 'var(--danger-600)' }}>({fmtMoney(payslip.total_deductions)})</span>
                </div>
              </div>
            </div>
          )}

          {/* Net */}
          <div className="flex justify-between px-4 py-3 rounded-lg font-bold text-base"
               style={{ background: 'var(--navy-500)', color: '#fff' }}>
            <span>Net Take-Home</span>
            <span>{fmtMoney(payslip.net_salary)}</span>
          </div>

          {/* Print */}
          <div className="flex justify-end pt-1">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors"
              style={{ background: 'var(--gray-100)', color: 'var(--gray-700)', borderColor: 'var(--gray-200)' }}
            >
              Print / Save PDF
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function MyPortal() {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const employeeId: number | null = (user as any)?.employee_id ?? null

  const { data: payslips = [], isLoading, isError } = useQuery<MyPayslip[]>({
    queryKey: ['my-payslips', employeeId],
    queryFn:  () => selfServiceApi.myPayslips(employeeId!),
    enabled:  !!employeeId,
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy-900)', fontFamily: 'Montserrat' }}>
          My Portal
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
          View your payslips and salary history
        </p>
      </div>

      {!employeeId ? (
        <div className="bg-white rounded-xl p-8 text-center" style={{ border: '1px solid var(--gray-200)' }}>
          <p className="text-4xl mb-3">🪪</p>
          <p className="font-medium" style={{ color: 'var(--gray-600)' }}>
            Your account is not linked to an employee record yet.
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--gray-400)' }}>
            Contact HR to link your user account to an employee profile.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--gray-200)' }}>
          {isLoading ? <Spinner /> : isError ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--danger-600)' }}>Failed to load payslips.</p>
          ) : payslips.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📄</p>
              <p className="font-medium" style={{ color: 'var(--gray-500)' }}>No payslips found</p>
              <p className="text-sm mt-1" style={{ color: 'var(--gray-400)' }}>Your payslips will appear here after payroll is processed.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
                  <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--gray-500)' }}>Period</th>
                  <th className="text-right px-6 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--gray-500)' }}>Gross</th>
                  <th className="text-right px-6 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--gray-500)' }}>Deductions</th>
                  <th className="text-right px-6 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--gray-500)' }}>Net</th>
                  <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--gray-500)' }}>Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {payslips.map((ps, i) => (
                  <tr key={ps.id} style={{ borderTop: i > 0 ? '1px solid var(--gray-100)' : undefined }}>
                    <td className="px-6 py-3.5 font-medium" style={{ color: 'var(--gray-800)' }}>
                      {MONTHS[ps.period_month - 1]} {ps.period_year}
                    </td>
                    <td className="px-6 py-3.5 text-right" style={{ color: 'var(--gray-700)' }}>
                      {fmtMoney(ps.gross_earnings)}
                    </td>
                    <td className="px-6 py-3.5 text-right" style={{ color: 'var(--danger-600)' }}>
                      ({fmtMoney(ps.total_deductions)})
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold" style={{ color: 'var(--navy-700)' }}>
                      {fmtMoney(ps.net_salary)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${runStatusBadge(ps.run_status)}`}>
                        {ps.run_status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedId(ps.id)}
                        className="text-xs font-medium transition-colors"
                        style={{ color: 'var(--navy-500)' }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <PayslipDetailModal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        payslipId={selectedId}
      />
    </div>
  )
}
