import { createContext, useContext, useEffect, useState } from 'react'
import { baseCatalog } from '../data/catalog'
import { fetchFilms } from '../data/tmdb'

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState(baseCatalog)
  const [filmsLive, setFilmsLive] = useState(false)

  useEffect(() => {
    let active = true
    fetchFilms({ pages: 3 })
      .then((films) => {
        if (!active || !films.length) return
        setCatalog((prev) => [...films, ...prev.filter((i) => i.type !== 'film')])
        setFilmsLive(true)
      })
      .catch(() => {
        /* offline / API down — keep the bundled fallback films */
      })
    return () => {
      active = false
    }
  }, [])

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
