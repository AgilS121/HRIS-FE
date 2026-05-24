import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { MenuProvider } from '@/context/MenuContext'
import PrivateRoute from '@/components/PrivateRoute'
import Sidebar from '@/components/Sidebar'
import TempPasswordBanner from '@/components/TempPasswordBanner'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Employees from '@/pages/Employees'
import Attendance from '@/pages/Attendance'
import Leave from '@/pages/Leave'
import Departments from '@/pages/Departments'
import Positions from '@/pages/Positions'
import Roles from '@/pages/Roles'
import Payroll from '@/pages/Payroll'
import Users from '@/pages/Users'
import WorkSchedule from '@/pages/WorkSchedule'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function AppShell() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-100 min-h-screen overflow-auto flex flex-col">
        <TempPasswordBanner />
        <div className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/employees"   element={<Employees />} />
          <Route path="/attendance"  element={<Attendance />} />
          <Route path="/leave"       element={<Leave />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/positions"   element={<Positions />} />
          <Route path="/roles"       element={<Roles />} />
          <Route path="/payroll"     element={<Payroll />} />
          <Route path="/users"         element={<Users />} />
          <Route path="/work-schedule" element={<WorkSchedule />} />
        </Routes>
        </div>
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
        <MenuProvider>
          <BrowserRouter>
            <RootRouter />
          </BrowserRouter>
        </MenuProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
