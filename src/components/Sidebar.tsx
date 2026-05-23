import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const links = [
  { to: '/employees',         label: 'Employees',   icon: '👤' },
  { to: '/attendance',        label: 'Attendance',  icon: '📋' },
  { to: '/leave',             label: 'Leave',       icon: '🏖️' },
  { to: '/master/companies',  label: 'Companies',   icon: '🏢' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="w-60 min-h-screen bg-navy-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-navy-500 flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">H</span>
          </div>
          <div>
            <p className="text-white font-display font-bold text-sm leading-tight">HRIS</p>
            <p className="text-navy-400 text-xs">TUV Nord Indonesia</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 pb-2 text-navy-400 text-xs font-medium uppercase tracking-wider">
          Main Menu
        </p>
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
                isActive
                  ? 'bg-navy-500 text-white font-medium'
                  : 'text-navy-200 hover:bg-navy-800 hover:text-white'
              }`
            }
          >
            <span className="text-base w-5 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="mx-3 mb-4 p-3 rounded-md bg-navy-800 border border-navy-700">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-navy-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-navy-400 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-2.5 w-full text-xs text-navy-300 hover:text-danger-400 transition text-left"
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}
