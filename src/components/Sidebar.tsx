import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/employees', label: 'Employees' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/leave', label: 'Leave' },
  { to: '/master/companies', label: 'Companies' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-gray-300 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-700">
        <span className="text-white font-bold text-lg">HRIS</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-gray-700 text-xs">
        <p className="font-medium text-white truncate">{user?.name}</p>
        <p className="text-gray-500 truncate">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-2 text-red-400 hover:text-red-300 transition"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
