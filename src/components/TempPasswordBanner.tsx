import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import ChangePasswordModal from './ChangePasswordModal'

export default function TempPasswordBanner() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)

  if (!user?.is_temp) return null

  const hours = user.hours_remaining ?? 0
  const days  = Math.floor(hours / 24)
  const hrs   = hours % 24

  const urgency = hours <= 24 ? 'danger' : hours <= 48 ? 'warning' : 'info'

  const colors = {
    danger:  { bg: 'var(--danger-50)',  border: '#FFCCD5', text: 'var(--danger-700)',  icon: '🔴' },
    warning: { bg: 'var(--warning-50)', border: '#FFE4A0', text: 'var(--warning-600)', icon: '🟡' },
    info:    { bg: 'var(--navy-50)',     border: '#C0C8F5', text: 'var(--navy-600)',    icon: '🔵' },
  }[urgency]

  const timeLabel = days > 0
    ? `${days} day${days > 1 ? 's' : ''} ${hrs}h`
    : `${hours}h`

  return (
    <>
      <div
        className="flex items-center justify-between px-5 py-2.5 text-sm gap-4"
        style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}`, color: colors.text }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span>{colors.icon}</span>
          <span>
            <strong>Temporary credentials active.</strong> You're logged in with your employee number.
            Please update your email and password.
            {hours >= 0
              ? <> Expires in <strong>{timeLabel}</strong>.</>
              : <> Your credentials have <strong>expired</strong>.</>
            }
          </span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 font-semibold underline hover:no-underline transition"
          style={{ color: colors.text }}
        >
          Update now →
        </button>
      </div>

      <ChangePasswordModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}
