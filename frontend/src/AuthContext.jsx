import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { checkHealth, getToken, login as apiLogin, setToken as persistToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [apiOnline, setApiOnline] = useState(null)

  useEffect(() => {
    let cancelled = false
    checkHealth().then((ok) => {
      if (!cancelled) setApiOnline(ok)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (username, password) => {
    const data = await apiLogin(username, password)
    persistToken(data.access_token)
    setTokenState(data.access_token)
    return data
  }, [])

  const signOut = useCallback(() => {
    persistToken(null)
    setTokenState(null)
  }, [])

  // Called by any request that comes back 401 so the whole app drops to the
  // login screen instead of leaving half-loaded pages behind.
  const forceSignOut = useCallback(() => {
    persistToken(null)
    setTokenState(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, isAuthed: !!token, apiOnline, signIn, signOut, forceSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
