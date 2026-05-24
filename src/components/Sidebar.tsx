import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useMenus } from '@/context/MenuContext'

const ALL_LINKS = [
  { to: '/dashboard',   label: 'Dashboard',          icon: '📊', key: 'dashboard'   },
  { to: '/employees',   label: 'Employees',          icon: '👤', key: 'employees'   },
  { to: '/attendance',  label: 'Attendance',         icon: '📋', key: 'attendance'  },
  { to: '/leave',       label: 'Leave',              icon: '🏖️', key: 'leave'       },
  { to: '/payroll',     label: 'Payroll',            icon: '💰', key: 'payroll'     },
  { to: '/departments', label: 'Departments',        icon: '🏢', key: 'departments' },
  { to: '/positions',   label: 'Positions',          icon: '🎯', key: 'positions'   },
  { to: '/work-schedule', label: 'Work Schedule',      icon: '🕐', key: 'work_schedule' },
  { to: '/roles',       label: 'Roles & Permissions',icon: '🔐', key: 'roles'       },
  { to: '/users',       label: 'Users',              icon: '👥', key: 'users'       },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { can, isUnrestricted } = useMenus()

  const links = ALL_LINKS.filter(l => l.key === 'dashboard' || isUnrestricted || can(l.key, 'view'))

  return (
    <aside
      className="w-60 min-h-screen flex flex-col shrink-0"
      style={{ backgroundColor: 'var(--navy-900)' }}
    >
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: 'var(--navy-500)' }}
          >
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'Montserrat' }}>H</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'Montserrat' }}>
              HRIS
            </p>
            <p className="text-xs" style={{ color: 'rgba(200,215,255,0.5)' }}>HR Management System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider"
           style={{ color: 'rgba(200,215,255,0.4)' }}>
          Main Menu
        </p>
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
                isActive ? 'font-medium' : ''
              }`
            }
            style={({ isActive }) => isActive
              ? { backgroundColor: 'var(--navy-500)', color: '#fff' }
              : { color: 'rgba(200,215,255,0.8)' }
            }
            onMouseEnter={e => {
              const el = e.currentTarget
              if (!el.getAttribute('aria-current')) {
                el.style.backgroundColor = 'rgba(255,255,255,0.06)'
                el.style.color = '#fff'
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              if (!el.getAttribute('aria-current')) {
                el.style.backgroundColor = ''
                el.style.color = 'rgba(200,215,255,0.8)'
              }
            }}
          >
            <span className="text-base w-5 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div
        className="mx-3 mb-4 p-3 rounded-md"
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--navy-500)' }}
          >
            <span className="text-white text-xs font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(200,215,255,0.5)' }}>
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-2.5 text-xs transition-colors text-left"
          style={{ color: 'rgba(200,215,255,0.45)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger-600)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,215,255,0.45)')}
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}
