import { createContext, useContext, useEffect, useState } from 'react'
import { login as loginRequest } from '../services/api.js'

const AuthContext = createContext(null)
const STORAGE_KEY = 'legumex_session'

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)

  useEffect(() => {
    try {
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // almacenamiento no disponible, se ignora silenciosamente
    }
  }, [session])

  async function login(username, password) {
    const result = await loginRequest(username, password)
    // result = { token, user: { id, username, name, role } }
    setSession(result)
    return result.user
  }

  function logout() {
    setSession(null)
  }

  const value = {
    user: session?.user || null,
    token: session?.token || null,
    login,
    logout,
    isAuthenticated: Boolean(session?.token),
    isAdmin: session?.user?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
