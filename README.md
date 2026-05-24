# feel-hris-fe

Admin web dashboard for the HRIS system, built with **React + Vite + Tailwind CSS**. Connects to [feel-hris-be](../feel-hris-be) — a REST API written in the [Feel language](https://github.com/AgilS121/feel).

## Features

| Module | Description |
|---|---|
| **Dashboard** | Overview cards — employee count, attendance summary, pending leave |
| **Employees** | Full CRUD: create with auto employee number + temp login, edit profile, upload contract, terminate. Contract expiry badge for employees expiring this month. Reporting To (supervisor) dropdown. |
| **Attendance** | View & manage daily attendance records, manual clock-in/out by admin |
| **Leave** | Manage leave types, allocate quotas, approve/reject/cancel requests |
| **Payroll** | Salary components (allowances, BPJS, deductions), monthly runs, payslip detail, lock & mark paid, Excel export, **BPJS/PPh21 seed**, prorate badge, **Excel import** for mass adjustment |
| **Overtime** | Submit overtime requests, approve/reject with notes, filter by status |
| **Shift & Roster** | Shift template CRUD + weekly roster grid (assign per employee per day) |
| **Departments** | CRUD |
| **Positions** | CRUD |
| **Work Schedule** | Work hours, grace period, geofence radius + office coordinates |
| **Roles & Permissions** | Create roles, assign to users, configure per-menu permissions (view/create/edit/delete) |
| **Users** | List all users, reset password, extend temporary credentials |
| **Audit Log** | Immutable log of sensitive changes (employee, payroll), filter by limit |

### Access Control
- Menu visibility driven by role permissions — users only see what their role allows
- Temporary credentials expire in 3 days and are flagged with a banner
- Dashboard and sidebar adapt to current user's role

## Tech Stack

- **React** 18 + **TypeScript**
- **Vite** 5 — dev server with `/api` proxy to backend
- **Tailwind CSS** 3 — utility-first styling
- **TanStack Query** v5 — data fetching, caching, mutations
- **React Router** v6 — client-side routing
- **Axios** — HTTP client with JWT interceptor (auto-redirect to /login on 401)
- **SheetJS (xlsx)** — Excel export (payroll report) + Excel import (mass payroll adjustment)

## Project Structure

```
src/
  api/
    client.ts              # axios instance + all API functions
  components/
    Sidebar.tsx            # nav + user card, permission-filtered links
    Modal.tsx
    FormField.tsx
    ConfirmDialog.tsx
    PrivateRoute.tsx
    TempPasswordBanner.tsx
    ChangePasswordModal.tsx
  context/
    AuthContext.tsx         # JWT auth state
    MenuContext.tsx         # role-based menu permissions
  pages/
    Login.tsx
    Dashboard.tsx
    Employees.tsx           # list + contract expiry filter + stat cards
    EmployeeForm.tsx        # create/edit with full profile tabs + reporting_to
    Attendance.tsx
    Leave.tsx
    Payroll.tsx             # runs + components + Excel import tab
    Overtime.tsx            # submit/approve/reject/cancel
    Shift.tsx               # shift templates + weekly roster grid
    WorkSchedule.tsx
    Departments.tsx / DepartmentForm.tsx
    Positions.tsx
    Roles.tsx
    Users.tsx
    AuditLog.tsx
  App.tsx                   # routes
  main.tsx
```

## Getting Started

### Prerequisites
- Node.js 18+
- feel-hris-be running (see [feel-hris-be](../feel-hris-be))

### Install & Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`. API calls are proxied to `http://localhost:3000` via Vite.

### Build for Production

```bash
npm run build
# output in dist/
```

### Proxy Configuration

In `vite.config.ts`, all `/api` requests are forwarded to the backend:

```ts
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
},
```

## Default Login

After running migrations and `seed_admin.feel` on the backend:

| Field | Value |
|---|---|
| Email | `admin@hris.local` |
| Password | `admin123` |

## API Overview

All requests go to `/api/*` and require `Authorization: Bearer <token>` (except login).

| Module | Base Path |
|---|---|
| Auth | `/api/auth/*` |
| Master data | `/api/master/*` |
| HR (employees, attendance, leave, payroll, overtime) | `/api/hr/*` |

## Related Projects

- [feel](https://github.com/AgilS121/feel) — the backend language
- [feel-hris-be](../feel-hris-be) — REST API backend (Feel)
- [feel-attendance](../feel-attendance) — Mobile attendance app (React Native + Expo)

## Author

**Agil S** — [github.com/AgilS121](https://github.com/AgilS121)
