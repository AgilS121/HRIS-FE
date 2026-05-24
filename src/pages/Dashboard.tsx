import { useQuery } from '@tanstack/react-query'
import { employeesApi, attendanceApi, leaveApi, payrollApi } from '@/api/client'

const COMPANY_ID = 1

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STATUS_COLORS: Record<string, string> = {
  present: '#22c55e',
  late:    '#f59e0b',
  absent:  '#ef4444',
  sick:    '#8b5cf6',
  permit:  '#06b6d4',
  leave:   '#3b82f6',
  holiday: '#6b7280',
  wfh:     '#14b8a6',
}

function StatCard({
  label, value, sub, color,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wide mb-1"
         style={{ color: 'var(--gray-500)' }}>
        {label}
      </p>
      <p className="text-3xl font-bold"
         style={{ fontFamily: 'Montserrat', color: color || 'var(--navy-900)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: 'var(--gray-400)' }}>{sub}</p>
      )}
    </div>
  )
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateDisplay(d: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${days[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  if (start === end) return `${MONTHS[s.getMonth()]} ${s.getDate()}`
  if (s.getMonth() === e.getMonth()) return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}`
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`
}

interface Employee {
  id: number
  status: string
}

interface AttendanceRecord {
  status: string
  date: string
}

interface LeaveRequest {
  id: number
  employee_name: string
  leave_type_name: string
  total_days: number
  start_date: string
  end_date: string
}

interface PayrollRun {
  id: number
  period_month: number
  period_year: number
  status: string
}

export default function Dashboard() {
  const today = todayStr()
  const todayDisplay = formatDateDisplay(new Date())

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', COMPANY_ID],
    queryFn: () => employeesApi.list(COMPANY_ID),
  })

  const { data: attendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', COMPANY_ID, today, today],
    queryFn: () => attendanceApi.list(COMPANY_ID, today, today),
  })

  const { data: pendingLeave = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['leave', 'pending', COMPANY_ID],
    queryFn: () => leaveApi.pending(COMPANY_ID),
  })

  const { data: payrollRuns = [] } = useQuery<PayrollRun[]>({
    queryKey: ['payroll', 'runs', COMPANY_ID],
    queryFn: () => payrollApi.runs(COMPANY_ID),
  })

  // Derived stats
  const activeEmployees = employees.filter((e: Employee) => e.status !== 'terminated').length

  const presentToday = attendance.filter((a: AttendanceRecord) =>
    a.status === 'present' || a.status === 'late'
  ).length

  const latestRun = payrollRuns.length > 0
    ? [...payrollRuns].sort((a: PayrollRun, b: PayrollRun) =>
        a.period_year !== b.period_year
          ? b.period_year - a.period_year
          : b.period_month - a.period_month
      )[0]
    : null

  const latestPayrollLabel = latestRun
    ? `${MONTHS[latestRun.period_month - 1]} ${latestRun.period_year}`
    : '—'

  const latestPayrollSub = latestRun ? latestRun.status : undefined

  // Attendance breakdown by status
  const statusCounts: Record<string, number> = {}
  for (const rec of attendance) {
    const s = rec.status ?? 'unknown'
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  }

  const statusOrder = ['present', 'late', 'absent', 'sick', 'permit', 'leave', 'holiday', 'wfh']
  const breakdownEntries = statusOrder
    .filter(s => statusCounts[s] > 0)
    .map(s => ({ status: s, count: statusCounts[s] }))

  const totalBreakdown = breakdownEntries.reduce((sum, e) => sum + e.count, 0)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold"
              style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
            {todayDisplay}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Active Employees"
          value={activeEmployees}
          color="var(--navy-900)"
        />
        <StatCard
          label="Present Today"
          value={presentToday}
          sub="present + late"
          color="#22c55e"
        />
        <StatCard
          label="Pending Leave"
          value={pendingLeave.length}
          sub="awaiting approval"
          color="#f59e0b"
        />
        <StatCard
          label="Latest Payroll"
          value={latestPayrollLabel}
          sub={latestPayrollSub}
          color="var(--navy-500)"
        />
      </div>

      {/* Bottom two panels */}
      <div className="grid grid-cols-2 gap-5">
        {/* Today's Attendance Breakdown */}
        <div className="card p-5">
          <h2 className="text-sm font-bold mb-4"
              style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            Today's Attendance
          </h2>

          {attendance.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--gray-400)' }}>
              No attendance records for today.
            </p>
          ) : (
            <div className="space-y-3">
              {breakdownEntries.map(({ status, count }) => {
                const color = STATUS_COLORS[status] ?? '#6b7280'
                const pct = totalBreakdown > 0 ? Math.round((count / totalBreakdown) * 100) : 0
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm capitalize" style={{ color: 'var(--gray-700)' }}>
                          {status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--gray-900)' }}>
                          {count}
                        </span>
                        <span className="text-xs w-8 text-right" style={{ color: 'var(--gray-400)' }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--gray-100)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending Leave Requests */}
        <div className="card p-5">
          <h2 className="text-sm font-bold mb-4"
              style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}>
            Pending Leave Requests
          </h2>

          {pendingLeave.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--gray-400)' }}>
              No pending leave requests.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingLeave.slice(0, 6).map((req: LeaveRequest) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg"
                  style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--gray-900)' }}>
                      {req.employee_name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--gray-500)' }}>
                      {req.leave_type_name} · {formatDateRange(req.start_date, req.end_date)}
                    </p>
                  </div>
                  <span className="badge-yellow ml-3 shrink-0">
                    {req.total_days}d
                  </span>
                </div>
              ))}
              {pendingLeave.length > 6 && (
                <p className="text-xs text-center pt-1" style={{ color: 'var(--gray-400)' }}>
                  +{pendingLeave.length - 6} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
