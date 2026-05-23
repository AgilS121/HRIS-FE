import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login:          (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data.data),
  me:             () => api.get('/auth/me').then((r) => r.data.data),
  logout:         () => api.post('/auth/logout').then((r) => r.data),
  myMenus:        () => api.get('/auth/my-menus').then((r) => r.data.data as MenuPermission[]),
  changePassword: (d: { current_password: string; new_email: string; new_password: string; confirm_password: string }) =>
    api.post('/auth/change-password', d).then((r) => r.data.data),
  extendTemp:     (userId: number) =>
    api.post(`/auth/users/${userId}/extend-temp`, {}).then((r) => r.data.data),
  tempUsers:      () => api.get('/auth/temp-users').then((r) => r.data.data),
}

export interface MenuPermission {
  menu_key:   string
  can_view:   boolean
  can_create: boolean
  can_edit:   boolean
  can_delete: boolean
}

export const rolesApi = {
  list:   (company_id: number) =>
    api.get('/master/roles', { params: { company_id } }).then((r) => r.data.data),
  get:    (id: number) =>
    api.get(`/master/roles/${id}`).then((r) => r.data.data),
  create: (d: object) =>
    api.post('/master/roles', d).then((r) => r.data.data),
  update: (id: number, d: object) =>
    api.put(`/master/roles/${id}`, d).then((r) => r.data.data),
  delete: (id: number) =>
    api.delete(`/master/roles/${id}`).then((r) => r.data),
  assignUserRole: (userId: number, roleId: number) =>
    api.put(`/master/users/${userId}/role`, { role_id: roleId }).then((r) => r.data),
}

// ─── Master ──────────────────────────────────────────────────────────────────

export const companiesApi = {
  list: () => api.get('/master/companies').then((r) => r.data.data),
  get: (id: number) => api.get(`/master/companies/${id}`).then((r) => r.data.data),
  create: (d: object) => api.post('/master/companies', d).then((r) => r.data.data),
  update: (id: number, d: object) => api.put(`/master/companies/${id}`, d).then((r) => r.data.data),
  delete: (id: number) => api.delete(`/master/companies/${id}`).then((r) => r.data),
}

export const departmentsApi = {
  list:   (company_id: number) =>
    api.get('/master/departments', { params: { company_id } }).then((r) => r.data.data),
  get:    (id: number) =>
    api.get(`/master/departments/${id}`).then((r) => r.data.data),
  create: (d: object) =>
    api.post('/master/departments', d).then((r) => r.data.data),
  update: (id: number, d: object) =>
    api.put(`/master/departments/${id}`, d).then((r) => r.data.data),
  delete: (id: number) =>
    api.delete(`/master/departments/${id}`).then((r) => r.data),
}

export const positionsApi = {
  list:   (company_id: number) =>
    api.get('/master/positions', { params: { company_id } }).then((r) => r.data.data),
  get:    (id: number) =>
    api.get(`/master/positions/${id}`).then((r) => r.data.data),
  create: (d: object) =>
    api.post('/master/positions', d).then((r) => r.data.data),
  update: (id: number, d: object) =>
    api.put(`/master/positions/${id}`, d).then((r) => r.data.data),
  delete: (id: number) =>
    api.delete(`/master/positions/${id}`).then((r) => r.data),
}

// ─── HR ──────────────────────────────────────────────────────────────────────

export const employeesApi = {
  list: (company_id: number) =>
    api.get('/hr/employees', { params: { company_id } }).then((r) => r.data.data),
  get: (id: number) => api.get(`/hr/employees/${id}`).then((r) => r.data.data),
  create: (d: object) => api.post('/hr/employees', d).then((r) => r.data.data),
  update: (id: number, d: object) => api.put(`/hr/employees/${id}`, d).then((r) => r.data.data),
  terminate: (id: number) => api.delete(`/hr/employees/${id}`).then((r) => r.data),

  // Extended profile endpoints (008)
  createFull: (d: object) =>
    api.post('/hr/employees/full', d).then((r) => r.data.data),
  updateFull: (id: number, d: object) =>
    api.put(`/hr/employees/${id}/full`, d).then((r) => r.data.data),
  nextNo: (department_id: number) =>
    api.get('/hr/employees/next-no', { params: { department_id } }).then((r) => r.data.data),
  uploadContract: (id: number, file: File, meta: Record<string, string | number | null>) => {
    const fd = new FormData()
    fd.append('contract', file)
    Object.entries(meta).forEach(([k, v]) => {
      if (v != null) fd.append(k, String(v))
    })
    return api.post(`/hr/employees/${id}/contract`, fd).then((r) => r.data.data)
  },
}

export const attendanceApi = {
  list: (company_id: number, date_from: string, date_to: string) =>
    api.get('/hr/attendance', { params: { company_id, date_from, date_to } }).then((r) => r.data.data),
  create: (d: object) => api.post('/hr/attendance', d).then((r) => r.data.data),
  update: (id: number, d: object) => api.put(`/hr/attendance/${id}`, d).then((r) => r.data.data),
  remove: (id: number) => api.delete(`/hr/attendance/${id}`).then((r) => r.data),
  clockIn: (employee_id: number, lat?: number, lng?: number) =>
    api.post('/hr/attendance/clock-in', { employee_id, lat, lng }).then((r) => r.data.data),
  clockOut: (employee_id: number) =>
    api.post('/hr/attendance/clock-out', { employee_id }).then((r) => r.data.data),
}

export const payrollApi = {
  // Components
  components:      (company_id: number) =>
    api.get('/hr/payroll-components', { params: { company_id } }).then((r) => r.data.data),
  createComponent: (d: object) =>
    api.post('/hr/payroll-components', d).then((r) => r.data.data),
  updateComponent: (id: number, d: object) =>
    api.put(`/hr/payroll-components/${id}`, d).then((r) => r.data.data),
  deleteComponent: (id: number) =>
    api.delete(`/hr/payroll-components/${id}`).then((r) => r.data),

  // Employee component overrides
  employeeComponents:    (employee_id: number) =>
    api.get(`/hr/employees/${employee_id}/components`).then((r) => r.data.data),
  setEmployeeComponent:  (employee_id: number, d: object) =>
    api.post(`/hr/employees/${employee_id}/components`, d).then((r) => r.data.data),
  removeEmployeeComponent: (id: number) =>
    api.delete(`/hr/employee-components/${id}`).then((r) => r.data),

  // Payroll runs
  runs:     (company_id: number) =>
    api.get('/hr/payroll-runs', { params: { company_id } }).then((r) => r.data.data),
  createRun: (d: object) =>
    api.post('/hr/payroll-runs', d).then((r) => r.data.data),
  generate: (id: number) =>
    api.post(`/hr/payroll-runs/${id}/generate`).then((r) => r.data.data),
  lock:     (id: number) =>
    api.put(`/hr/payroll-runs/${id}/lock`).then((r) => r.data.data),
  markPaid: (id: number) =>
    api.put(`/hr/payroll-runs/${id}/paid`).then((r) => r.data.data),

  // Payslips
  payslips: (run_id: number) =>
    api.get(`/hr/payroll-runs/${run_id}/payslips`).then((r) => r.data.data),
  payslip:  (id: number) =>
    api.get(`/hr/payslips/${id}`).then((r) => r.data.data),
}

export const leaveApi = {
  // Leave types
  types:      (company_id: number) =>
    api.get('/hr/leave-types', { params: { company_id } }).then((r) => r.data.data),
  createType: (d: object) =>
    api.post('/hr/leave-types', d).then((r) => r.data.data),
  updateType: (id: number, d: object) =>
    api.put(`/hr/leave-types/${id}`, d).then((r) => r.data.data),
  deleteType: (id: number) =>
    api.delete(`/hr/leave-types/${id}`).then((r) => r.data),

  // Leave balances
  myBalances:  (employee_id: number, year: number) =>
    api.get('/hr/leave-balances', { params: { employee_id, year } }).then((r) => r.data.data),
  allBalances: (company_id: number, year: number) =>
    api.get('/hr/leave-balances/all', { params: { company_id, year } }).then((r) => r.data.data),
  initBalance: (d: object) =>
    api.post('/hr/leave-balances/init', d).then((r) => r.data.data),
  adjust:      (d: object) =>
    api.post('/hr/leave-adjustments', d).then((r) => r.data.data),

  // Leave requests
  myRequests: (employee_id: number) =>
    api.get('/hr/leave-requests/mine', { params: { employee_id } }).then((r) => r.data.data),
  list:       (company_id: number) =>
    api.get('/hr/leave-requests', { params: { company_id } }).then((r) => r.data.data),
  pending:    (company_id: number) =>
    api.get('/hr/leave-requests/pending', { params: { company_id } }).then((r) => r.data.data),
  create: (d: object, file?: File | null) => {
    if (file) {
      const fd = new FormData()
      Object.entries(d as Record<string, unknown>).forEach(([k, v]) => {
        if (v != null) fd.append(k, String(v))
      })
      fd.append('attachment', file)
      return api.post('/hr/leave-requests', fd).then((r) => r.data.data)
    }
    return api.post('/hr/leave-requests', d).then((r) => r.data.data)
  },
  approve:    (id: number, note?: string) =>
    api.put(`/hr/leave-requests/${id}/approve`, { note }).then((r) => r.data.data),
  reject:     (id: number, note: string) =>
    api.put(`/hr/leave-requests/${id}/reject`, { note }).then((r) => r.data.data),
  cancel:     (id: number, reason?: string) =>
    api.put(`/hr/leave-requests/${id}/cancel`, { reason }).then((r) => r.data.data),
}
