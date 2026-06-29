import { createContext, useContext, useEffect, useState } from 'react'

const THEMES = [
  { key: 'paper', label: 'Paper' },
  { key: 'ink', label: 'Ink' },
  { key: 'mist', label: 'Mist' },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('curio-theme') || 'paper')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('curio-theme', theme)
  }, [theme])

  const cycle = () => {
    const i = THEMES.findIndex((t) => t.key === theme)
    setTheme(THEMES[(i + 1) % THEMES.length].key)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycle, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
