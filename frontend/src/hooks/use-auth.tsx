import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authAPI } from '../services/api'
import type { User } from '../types'

export interface RegisterData {
  username: string
  email: string
  password: string
  village: string
  phone: string
}

interface AuthContextType {
  user: User | null
  panchayatName: string | null
  login: (username: string, password: string) => Promise<User>
  register: (data: RegisterData) => Promise<User>
  logout: () => Promise<void>
  isLoading: boolean
}

export interface RegisterData {
  username: string
  email: string
  password: string
  village: string
  phone: string
  panchayatId: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [panchayatName, setPanchayatName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Restore the session from the session cookie on first load
    authAPI
      .me()
      .then((data) => {
        if (cancelled) return
        setUser(data.user)
        setPanchayatName(data.panchayat?.name ?? null)
      })
      .catch(() => {
        // 401 or network failure both mean "not signed in" for shell purposes
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (username: string, password: string) => {
    // Tenant-scoped caches must never survive a user switch
    queryClient.clear()
    const data = await authAPI.login(username, password)
    setUser(data.user)
    setPanchayatName(null)
    return data.user
  }

  const register = async (data: RegisterData) => {
    const result = await authAPI.register(data)
    setUser(result.user)
    setPanchayatName(null)
    return result.user
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } finally {
      setUser(null)
      setPanchayatName(null)
      // Drop every tenant-scoped cache entry so no data leaks across users
      queryClient.clear()
    }
  }

  const contextValue = { user, panchayatName, login, register, logout, isLoading }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
