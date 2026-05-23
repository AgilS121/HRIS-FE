import { ReactNode } from 'react'

interface Props {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}

export default function FormField({ label, required, error, children }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--gray-700)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
