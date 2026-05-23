import { useQuery } from '@tanstack/react-query'
import { employeesApi } from '@/api/client'

interface Employee {
  id: number
  employee_number: string
  name: string
  email: string | null
  department_name: string | null
  position_name: string | null
  employment_type: string
  status: string
  hire_date: string
}

const DEMO_COMPANY_ID = 1

export default function Employees() {
  const { data, isLoading, isError } = useQuery<Employee[]>({
    queryKey: ['employees', DEMO_COMPANY_ID],
    queryFn: () => employeesApi.list(DEMO_COMPANY_ID),
  })

  if (isLoading) return <div className="p-6 text-gray-500">Loading…</div>
  if (isError) return <div className="p-6 text-red-600">Failed to load employees.</div>

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Employees</h1>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="px-4 py-3 text-left">No.</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-left">Position</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500">{emp.employee_number}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                <td className="px-4 py-3 text-gray-600">{emp.department_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{emp.position_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{emp.employment_type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    emp.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {emp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400">No employees found.</div>
        )}
      </div>
    </div>
  )
}
