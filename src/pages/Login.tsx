import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const raw = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? ''
      const msg = raw === 'temp_expired'
        ? 'Your temporary credentials have expired. Please contact your administrator to extend access.'
        : raw || 'Login failed. Please check your credentials.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — brand + animation ───────────────────────────────── */}
      <div
        className="hidden lg:flex w-[460px] shrink-0 flex-col justify-between p-10 relative overflow-hidden"
        style={{ backgroundColor: 'var(--navy-900)' }}
      >
        {/* Floating blobs */}
        <div className="absolute inset-0 pointer-events-none">
          {/* big circle top-right */}
          <div
            className="animate-float-slow absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, var(--navy-500) 0%, transparent 70%)' }}
          />
          {/* medium circle bottom-left */}
          <div
            className="animate-float-med absolute -bottom-10 -left-10 w-56 h-56 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, var(--pink-500) 0%, transparent 70%)' }}
          />
          {/* pink accent top-left */}
          <div
            className="animate-float-fast absolute top-1/3 -left-8 w-32 h-32 rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, var(--pink-500) 0%, transparent 65%)' }}
          />
          {/* small dot grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
          {/* geometric lines */}
          <svg className="absolute bottom-20 right-0 w-64 h-64 opacity-10" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="0.8"/>
            <circle cx="100" cy="100" r="55" stroke="white" strokeWidth="0.8"/>
            <circle cx="100" cy="100" r="30" stroke="white" strokeWidth="0.8"/>
            <line x1="20" y1="100" x2="180" y2="100" stroke="white" strokeWidth="0.8"/>
            <line x1="100" y1="20" x2="100" y2="180" stroke="white" strokeWidth="0.8"/>
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center animate-pulse-ring"
              style={{ backgroundColor: 'var(--navy-500)' }}
            >
              <span className="text-white font-bold text-lg" style={{ fontFamily: 'Montserrat' }}>H</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight" style={{ fontFamily: 'Montserrat' }}>HRIS</p>
              <p className="text-xs" style={{ color: 'rgba(200,215,255,0.6)' }}>HR Management System</p>
            </div>
          </div>

          <h1
            className="text-white font-bold text-3xl leading-snug mb-4"
            style={{ fontFamily: 'Montserrat' }}
          >
            Human Resource<br />Information System
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(200,215,255,0.75)' }}>
            Manage your workforce efficiently. Track employees, attendance, leave, and more — all in one place.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {[
            { label: 'Employees',        desc: 'Centralized employee data',   delay: '0.25s' },
            { label: 'Attendance',       desc: 'Real-time clock-in tracking', delay: '0.35s' },
            { label: 'Leave Management', desc: 'Automated leave approval',    delay: '0.45s' },
          ].map(({ label, desc, delay }) => (
            <div
              key={label}
              className="flex items-start gap-3 animate-fade-in-up"
              style={{ animationDelay: delay }}
            >
              <div
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: 'var(--pink-500)' }}
              />
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-xs" style={{ color: 'rgba(200,215,255,0.55)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — login form ──────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ background: 'var(--gray-100)' }}
      >
        <div className="w-full max-w-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--navy-500)' }}
            >
              <span className="text-white font-bold" style={{ fontFamily: 'Montserrat' }}>H</span>
            </div>
            <p className="font-bold text-xl" style={{ fontFamily: 'Montserrat', color: 'var(--navy-900)' }}>
              HRIS
            </p>
          </div>

          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'Montserrat', color: 'var(--gray-900)' }}
          >
            Welcome back
          </h2>
          <p className="text-sm mb-7" style={{ color: 'var(--gray-500)' }}>
            Sign in to your account to continue
          </p>

          {error && (
            <div
              className="mb-5 flex items-start gap-2.5 rounded-md px-4 py-3 text-sm animate-fade-in"
              style={{ background: 'var(--danger-50)', border: '1px solid #FFCCD5', color: 'var(--danger-700)' }}
            >
              <span className="mt-0.5 shrink-0">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--gray-700)' }}>
                Email / Employee number
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="Email or employee number"
              />
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--gray-700)' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            <div className="animate-fade-in-up pt-1" style={{ animationDelay: '0.4s' }}>
              <button
                type="submit"
                disabled={busy}
                className="btn-md btn-primary w-full"
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign in'}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-xs" style={{ color: 'var(--gray-400)' }}>
            © {new Date().getFullYear()} HRIS · All rights reserved
          </p>
        </div>
      </div>
    </div>
  )
}
