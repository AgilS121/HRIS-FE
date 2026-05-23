import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import Modal from './Modal'
import FormField from './FormField'

interface Props { open: boolean; onClose: () => void }

export default function ChangePasswordModal({ open, onClose }: Props) {
  const { user, refreshUser } = useAuth()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    current_password: '', new_email: '', new_password: '', confirm_password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.current_password)    e.current_password  = 'Current password is required'
    if (!form.new_email)           e.new_email         = 'Email is required'
    if (!form.new_password)        e.new_password      = 'New password is required'
    if (form.new_password.length < 8) e.new_password   = 'Minimum 8 characters'
    if (form.new_password !== form.confirm_password) e.confirm_password = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(form),
    onSuccess: (data) => {
      // Update token + refresh user
      localStorage.setItem('token', data.token)
      refreshUser()
      qc.invalidateQueries({ queryKey: ['my-menus'] })
      onClose()
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate()
  }

  const serverErr = (mutation.error as { response?: { data?: { message?: string } } } | null)
    ?.response?.data?.message

  return (
    <Modal open={open} onClose={onClose} title="Update Your Credentials" width="max-w-md">
      <div className="mb-5 rounded-lg p-4 text-sm" style={{ background: 'var(--navy-50)', color: 'var(--navy-700)' }}>
        <p className="font-semibold mb-1">Why do I need to do this?</p>
        <p>
          You're currently using a temporary account (<strong>{user?.email}</strong>).
          Set a real email and password to keep access after the temp period ends.
        </p>
      </div>

      {serverErr && (
        <div className="mb-4 rounded-md px-4 py-3 text-sm"
             style={{ background: 'var(--danger-50)', color: 'var(--danger-700)' }}>
          {serverErr}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <FormField label="Current password (your employee number)" required error={errors.current_password}>
          <input className="input" type="password" value={form.current_password}
                 onChange={set('current_password')} autoFocus />
        </FormField>

        <hr style={{ borderColor: 'var(--gray-200)' }} />

        <FormField label="New email address" required error={errors.new_email}>
          <input className="input" type="email" value={form.new_email}
                 onChange={set('new_email')} placeholder="your@email.com" />
        </FormField>

        <FormField label="New password" required error={errors.new_password}>
          <input className="input" type="password" value={form.new_password}
                 onChange={set('new_password')} placeholder="Minimum 8 characters" />
        </FormField>

        <FormField label="Confirm new password" required error={errors.confirm_password}>
          <input className="input" type="password" value={form.confirm_password}
                 onChange={set('confirm_password')} />
        </FormField>

        <div className="flex gap-3 justify-end pt-2"
             style={{ borderTop: '1px solid var(--gray-200)' }}>
          <button type="button" className="btn-md btn-secondary"
                  onClick={onClose} disabled={mutation.isPending}>
            Later
          </button>
          <button type="submit" className="btn-md btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Update credentials'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
