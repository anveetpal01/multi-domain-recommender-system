import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiDelete } from './api'
import { useAuth } from './AuthContext'
import { buildTaste } from './recommender'

const LibraryContext = createContext(null)

export function LibraryProvider({ children }) {
  const { token } = useAuth()
  const [liked, setLiked] = useState([])
  const [loading, setLoading] = useState(false)

  // Load the signed-in user's saved items from the backend (per-user).
  useEffect(() => {
    if (!token) {
      setLiked([])
      return
    }
    let active = true
    setLoading(true)
    apiGet('/library', token)
      .then((items) => {
        if (active) setLiked(Array.isArray(items) ? items : [])
      })
      .catch(() => {
        if (active) setLiked([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [token])

  const likedIds = useMemo(() => new Set(liked.map((i) => i.id)), [liked])
  const taste = useMemo(() => buildTaste(liked), [liked])

  const value = useMemo(() => {
    const isSaved = (id) => likedIds.has(id)

    const toggleSave = async (item) => {
      const slim = {
        id: item.id,
        type: item.type,
        title: item.title,
        creator: item.creator || '',
        cover: item.cover || null,
        year: item.year ?? null,
        meta: item.meta || '',
        tags: item.tags || [],
      }
      if (likedIds.has(item.id)) {
        setLiked((prev) => prev.filter((i) => i.id !== item.id))
        try {
          await apiDelete(`/library/${encodeURIComponent(item.id)}`, token)
        } catch {
          /* optimistic UI already updated */
        }
      } else {
        setLiked((prev) => [...prev, slim])
        try {
          await apiPost('/library', slim, token)
        } catch {
          /* optimistic UI already updated */
        }
      }
    }

    return { liked, likedIds, taste, loading, isSaved, toggleSave }
  }, [liked, likedIds, taste, loading, token])

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
  return ctx
}
