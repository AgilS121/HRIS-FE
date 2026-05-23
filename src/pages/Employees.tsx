import { useQuery } from '@tanstack/react-query'
import { employeesApi } from '@/api/client'

interface Employee {
  id: number
  employee_no: string
  full_name: string
  email: string | null
  department_name: string | null
  position_name: string | null
  employment_type: string
  status: string
  join_date: string
}

const DEMO_COMPANY_ID = 1

const STATUS_BADGE: Record<string, string> = {
  active:     'badge-green',
  suspended:  'badge-yellow',
  resigned:   'badge-gray',
  terminated: 'badge-red',
}

const TYPE_LABEL: Record<string, string> = {
  permanent: 'Permanent',
  contract:  'Contract',
  intern:    'Intern',
  outsource: 'Outsource',
}

export default function Employees() {
  const { data, isLoading, isError } = useQuery<Employee[]>({
    queryKey: ['employees', DEMO_COMPANY_ID],
    queryFn: () => employeesApi.list(DEMO_COMPANY_ID),
  })

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your workforce and employee records
          </p>
        </div>
        <button className="btn-md btn-primary">
          + Add Employee
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total',      value: data?.length ?? '—',                                          color: 'text-navy-500' },
          { label: 'Active',     value: data?.filter(e => e.status === 'active').length ?? '—',       color: 'text-success-600' },
          { label: 'On Leave',   value: '—',                                                          color: 'text-warning-600' },
          { label: 'Terminated', value: data?.filter(e => e.status === 'terminated').length ?? '—',   color: 'text-danger-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card px-5 py-4">
            <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
            <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            {isLoading ? 'Loading…' : `${data?.length ?? 0} employees`}
          </p>
          <input
            className="input w-56 text-xs py-1.5"
            placeholder="Search employee…"
          />
        </div>

        {/* Table */}
        {isError ? (
          <div className="px-5 py-10 text-center text-danger-600 text-sm">
            Failed to load employees.
          </div>
        ) : isLoading ? (
          <div className="px-5 py-10 text-center">
            <div className="inline-block w-6 h-6 rounded-full border-2 border-navy-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Position
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
                          <span className="text-navy-600 font-semibold text-xs">
                            {emp.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{emp.full_name}</p>
                          <p className="text-gray-400 text-xs font-mono">{emp.employee_no}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 text-sm">
                      {emp.department_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 text-sm">
                      {emp.position_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="badge badge-navy">
                        {TYPE_LABEL[emp.employment_type] ?? emp.employment_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={STATUS_BADGE[emp.status] ?? 'badge badge-gray'}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button className="btn-sm btn-ghost text-xs px-2 py-1">
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data?.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="text-gray-400 text-sm">No employees found.</p>
                <button className="btn-md btn-primary mt-3">Add first employee</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
