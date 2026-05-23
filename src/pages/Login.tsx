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
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Login failed. Please check your credentials.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Left panel */}
      <div className="hidden lg:flex w-[420px] bg-navy-900 flex-col justify-between p-10 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-lg bg-navy-500 flex items-center justify-center">
              <span className="text-white font-display font-bold text-lg">H</span>
            </div>
            <div>
              <p className="text-white font-display font-bold text-lg leading-tight">HRIS</p>
              <p className="text-navy-400 text-sm">TUV Nord Indonesia</p>
            </div>
          </div>
          <h1 className="text-white font-display font-bold text-3xl leading-tight mb-4">
            Human Resource<br />Information System
          </h1>
          <p className="text-navy-300 text-sm leading-relaxed">
            Manage your workforce efficiently. Track employees, attendance, leave, and more — all in one place.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Employees', desc: 'Centralized employee data' },
            { label: 'Attendance', desc: 'Real-time clock-in tracking' },
            { label: 'Leave Management', desc: 'Automated leave approval' },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-pink-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-navy-400 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-navy-500 flex items-center justify-center">
              <span className="text-white font-display font-bold">H</span>
            </div>
            <p className="font-display font-bold text-navy-900 text-xl">HRIS</p>
          </div>

          <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-7">Sign in to your account to continue</p>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-md bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 text-sm">
              <span className="mt-0.5 shrink-0">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn-md btn-primary w-full mt-1"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} TUV Nord Indonesia · DTIT Division
          </p>
        </div>
      </div>
    </div>
  )
}
