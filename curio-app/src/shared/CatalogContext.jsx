import { createContext, useContext, useEffect, useState } from 'react'
import { baseCatalog } from '../data/catalog'
import { apiGet } from './api'
import { useAuth } from './AuthContext'

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const { token } = useAuth()
  const [catalog, setCatalog] = useState(baseCatalog)
  const [filmsLive, setFilmsLive] = useState(false)

  // The server owns the catalog (seeded domains + TMDB films fetched
  // server-side, so no API key ships in this bundle). Refetch on login too —
  // that's the moment we know the backend is awake.
  useEffect(() => {
    let active = true
    apiGet('/catalog')
      .then((items) => {
        if (!active || !Array.isArray(items) || !items.length) return
        setCatalog(items)
        setFilmsLive(items.some((i) => i.id?.startsWith('film-tmdb-')))
      })
      .catch(() => {
        /* offline / backend waking — the bundled fallback keeps the app usable */
      })
    return () => {
      active = false
    }
  }, [token])

  return (
    <CatalogContext.Provider value={{ catalog, filmsLive }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}
