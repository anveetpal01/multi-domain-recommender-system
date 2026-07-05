import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCatalog } from '../shared/CatalogContext'
import { useLibrary } from '../shared/LibraryContext'
import { useAuth } from '../shared/AuthContext'
import { matchScore, withScores } from '../shared/recommender'
import { apiGet } from '../shared/api'
import { CoverTile } from '../shared/ItemCard'
import { DOMAINS, accentFor } from '../data/catalog'
import { EmptyState } from '../shared/ui'
import s from './Detail.module.css'

const singular = (t) => {
  const l = DOMAINS[t]?.label || t
  return l.endsWith('s') ? l.slice(0, -1) : l
}

export default function Detail() {
  const { id } = useParams()
  const decoded = decodeURIComponent(id || '')
  const nav = useNavigate()
  const { catalog } = useCatalog()
  const { taste, liked, isSaved, toggleSave } = useLibrary()
  const { token } = useAuth()

  const item = useMemo(
    () => catalog.find((i) => i.id === decoded) || liked.find((i) => i.id === decoded),
    [catalog, liked, decoded],
  )

  const localRelated = useMemo(() => {
    if (!item) return []
    const list = catalog.filter(
      (i) => i.id !== item.id && (i.tags || []).some((t) => (item.tags || []).includes(t)),
    )
    return withScores(list, taste)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }, [catalog, item, taste])

  // Server-side "similar" (tag similarity + co-save behaviour across users);
  // the locally computed list covers the gap while the request is in flight.
  const [serverRelated, setServerRelated] = useState(null)
  useEffect(() => {
    setServerRelated(null)
    if (!token || !decoded) return
    let active = true
    apiGet(`/recommendations/similar/${encodeURIComponent(decoded)}?limit=6`, token)
      .then((r) => {
        if (active && Array.isArray(r) && r.length) setServerRelated(r)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [token, decoded])

  const related = serverRelated || localRelated

  if (!item) {
    return (
      <div className="container">
        <EmptyState title="Not in the library">
          <button className={s.back} onClick={() => nav(-1)}>
            ← Go back
          </button>
        </EmptyState>
      </div>
    )
  }

  const score = matchScore(item, taste)
  const matched = (item.tags || []).filter((t) => taste[t])
  const saved = isSaved(item.id)

  return (
    <div className={`${s.page} fade-in`}>
      <div className="container">
        <button className={s.back} onClick={() => nav(-1)}>
          ← Back
        </button>

        <div className={s.top}>
          <div
            className={s.coverCol}
            style={{ '--accent-domain': accentFor(item.type) }}
          >
            <div className={s.cover}>
              <CoverTile item={item} aspect="3 / 4" />
            </div>
          </div>

          <div className={s.info}>
            <p className="eyebrow">{singular(item.type)}</p>
            <h1 className={s.title}>{item.title}</h1>
            <p className={s.meta}>
              {[item.creator, item.year, item.meta].filter(Boolean).join(' · ')}
            </p>

            <p className={s.score}>
              {score}
              <span className="eyebrow"> % match for you</span>
            </p>

            <ul className={s.reasons}>
              {matched.length > 0 && (
                <li>Shares {matched.slice(0, 3).join(', ')} with what you already keep.</li>
              )}
              <li>Recommended across domains, not just within {DOMAINS[item.type].label.toLowerCase()}.</li>
            </ul>

            {item.description && <p className={s.desc}>{item.description}</p>}

            <div className={s.tags}>
              {(item.tags || []).map((t) => (
                <Link key={t} to={`/search`} className={s.tag}>
                  {t}
                </Link>
              ))}
            </div>

            <button
              className={s.save}
              onClick={() => toggleSave(item)}
              aria-pressed={saved}
            >
              {saved ? 'Saved to library ✓' : 'Save to library'}
            </button>
          </div>
        </div>

        {related.length > 0 && (
          <section className={s.threads}>
            <div className={s.threadsHead}>
              <h2 className={s.threadsTitle}>Threads across your library</h2>
              <span className="eyebrow">because this connects to what you love</span>
            </div>
            <div className={s.relList}>
              {related.map((r) => (
                <Link
                  key={r.id}
                  to={`/item/${encodeURIComponent(r.id)}`}
                  className={s.relRow}
                >
                  <div className={s.relThumb}>
                    <CoverTile item={r} aspect="1 / 1" />
                  </div>
                  <div className={s.relMeta}>
                    <span className={s.relDomain}>{singular(r.type)}</span>
                    <h4>{r.title}</h4>
                    {r.creator && <p>{r.creator}</p>}
                  </div>
                  <span className={s.relScore}>{r.score}%</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
