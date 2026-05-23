import { createContext, useContext, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi, MenuPermission } from '@/api/client'
import { useAuth } from './AuthContext'

interface MenuCtx {
  menus: MenuPermission[]
  can: (key: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean
  loading: boolean
  // true when user has no role assigned → treat as superadmin
  isUnrestricted: boolean
}

const MenuContext = createContext<MenuCtx | null>(null)

export function MenuProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const { data: menus = [], isLoading } = useQuery<MenuPermission[]>({
    queryKey: ['my-menus'],
    queryFn:  authApi.myMenus,
    enabled:  !!user,
    staleTime: 60_000,
  })

  // Empty menus = user has no role = superadmin (show everything)
  const isUnrestricted = !isLoading && menus.length === 0

  const can = (key: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    if (isUnrestricted) return true
    const perm = menus.find(m => m.menu_key === key)
    if (!perm) return false
    return !!perm[`can_${action}` as keyof MenuPermission]
  }

  return (
    <MenuContext.Provider value={{ menus, can, loading: isLoading, isUnrestricted }}>
      {children}
    </MenuContext.Provider>
  )
}

export function useMenus() {
  const ctx = useContext(MenuContext)
  if (!ctx) throw new Error('useMenus must be inside MenuProvider')
  return ctx
}
