import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ReactNode } from 'react'

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  return user ? <>{children}</> : <Navigate to="/login" replace />
}
