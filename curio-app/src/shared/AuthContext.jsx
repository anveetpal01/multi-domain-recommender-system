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
  const [onboarded, setOnboardedState] = useState(
    () => localStorage.getItem('curio-onboarded') === 'true',
  )

  function setOnboarded() {
    setOnboardedState(true)
    localStorage.setItem('curio-onboarded', 'true')
  }

  function persist(data) {
    const nextUser = { name: data.name, email: data.email, role: data.role }
    setToken(data.token)
    setUser(nextUser)
    localStorage.setItem('curio-token', data.token)
    localStorage.setItem('curio-user', JSON.stringify(nextUser))
  }

  function logout() {
    setToken(null)
    setUser(null)
    setOnboardedState(false)
    localStorage.removeItem('curio-token')
    localStorage.removeItem('curio-user')
    localStorage.removeItem('curio-onboarded')
  }

  useEffect(() => {
    if (!token) return
    apiGet('/auth/me', token).catch((err) => {
      if (err.status === 401) logout()
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

  return (
    <AuthContext.Provider value={{ token, user, isAuthed: !!token, login, register, loginWithGoogle, logout, onboarded, setOnboarded }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
