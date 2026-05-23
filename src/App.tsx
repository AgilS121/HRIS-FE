import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import PrivateRoute from '@/components/PrivateRoute'
import Sidebar from '@/components/Sidebar'
import Login from '@/pages/Login'
import Employees from '@/pages/Employees'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function AppShell() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50">
        <Routes>
          <Route path="/" element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<Employees />} />
          {/* More pages wired in as they're built */}
        </Routes>
      </main>
    </div>
  )
}

function RootRouter() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <RootRouter />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
