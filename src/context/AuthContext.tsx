import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi } from '@/api/client'

interface User {
  id: number
  email: string
  name: string
  is_temp: boolean
  hours_remaining: number | null
  temp_until: string | null
}

interface AuthCtx {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<{ is_temp: boolean; hours_remaining: number | null }>
  logout: () => void
  refreshUser: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null)
  const [token, setToken]   = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(!!token)

  const fetchMe = async () => {
    const data = await authApi.me()
    setUser(data)
  }

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetchMe()
      .catch(() => { localStorage.removeItem('token'); setToken(null) })
      .finally(() => setLoading(false))
  }, [token])

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser({ ...data.user, is_temp: !!data.is_temp, hours_remaining: data.hours_remaining, temp_until: data.temp_until })
    return { is_temp: !!data.is_temp, hours_remaining: data.hours_remaining }
  }

  const logout = () => {
    authApi.logout().catch(() => {})
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const refreshUser = fetchMe

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
