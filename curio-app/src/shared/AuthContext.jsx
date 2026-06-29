import { createContext, useContext, useEffect, useState } from 'react'
import { apiPost, apiGet } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('curio-token'))
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('curio-user'))
    } catch {
      return null
    }
  })

  function store(nextUser) {
    setUser(nextUser)
    localStorage.setItem('curio-user', JSON.stringify(nextUser))
  }

  function persist(data) {
    setToken(data.token)
    localStorage.setItem('curio-token', data.token)
    store({ name: data.name, email: data.email, role: data.role, onboarded: !!data.onboarded })
  }

  function logout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('curio-token')
    localStorage.removeItem('curio-user')
  }

  useEffect(() => {
    if (!token) return
    apiGet('/auth/me', token)
      .then((me) =>
        store({ name: me.name, email: me.email, role: me.role, onboarded: !!me.onboarded }),
      )
      .catch((err) => {
        if (err.status === 401 || err.status === 403) logout()
      })
  }, [token])

  async function login(email, password) {
    const data = await apiPost('/auth/login', { email, password })
    persist(data)
    return data
  }

  async function register(email, password, name) {
    const data = await apiPost('/auth/register', { email, password, name })
    persist(data)
    return data
  }

  async function loginWithGoogle(idToken) {
    const data = await apiPost('/auth/google', { idToken })
    persist(data)
    return data
  }

  async function setOnboarded() {
    await apiPost('/auth/onboarded', {}, token)
    store({ ...(user || {}), onboarded: true })
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthed: !!token,
        onboarded: !!user?.onboarded,
        login,
        register,
        loginWithGoogle,
        setOnboarded,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
