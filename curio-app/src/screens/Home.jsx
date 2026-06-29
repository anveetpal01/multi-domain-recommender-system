import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCatalog } from '../shared/CatalogContext'
import { useLibrary } from '../shared/LibraryContext'
import { useAuth } from '../shared/AuthContext'
import { topPick, crossings, recommend } from '../shared/recommender'
import { DOMAINS, accentFor } from '../data/catalog'
import { ItemCard, CoverTile } from '../shared/ItemCard'
import { SearchIcon, ArrowIcon } from '../shared/ui'
import { greeting, longDate } from '../shared/util'
import s from './Home.module.css'

const singular = (t) => {
  const l = DOMAINS[t]?.label || t
  return l.endsWith('s') ? l.slice(0, -1) : l
}

export default function Home() {
  const { catalog } = useCatalog()
  const { taste, liked, isSaved, toggleSave } = useLibrary()
  const { user } = useAuth()
  const nav = useNavigate()

  const excludeIds = useMemo(() => liked.map((i) => i.id), [liked])

  const pick = useMemo(
    () => topPick(catalog, taste, { excludeIds }),
    [catalog, taste, excludeIds],
  )
  const threads = useMemo(
    () => crossings(catalog, taste, { excludeIds, perThread: 4, threads: 2 }),
    [catalog, taste, excludeIds],
  )
  const filmRow = useMemo(
    () => recommend(catalog, taste, { types: ['film'], excludeIds, limit: 5 }),
    [catalog, taste, excludeIds],
  )

  const matched = pick ? (pick.tags || []).filter((t) => taste[t]) : []

  return (
    <div className={cxPage}>
      <div className="container">
        <header className={s.top}>
          <div>
            <p className="eyebrow">{longDate()}</p>
            <h1 className={s.hello}>
              {greeting()}, {user?.name || 'Reader'}
            </h1>
          </div>
          <Link to="/search" className={s.searchBtn}>
            <SearchIcon size={16} />
            <span>Search</span>
            <kbd>⌘K</kbd>
          </Link>
        </header>

        {pick && (
          <section
            className={s.hero}
            style={{ '--accent-domain': accentFor(pick.type) }}
          >
            <div className={s.heroText}>
              <p className="eyebrow">Today&apos;s pick · {singular(pick.type)}</p>
              <h2 className={s.heroTitle}>{pick.title}</h2>
              <p className={s.heroMeta}>
                {[pick.creator, pick.year, pick.meta].filter(Boolean).join(' · ')}
              </p>
              <p className={s.score}>
                {pick.score}
                <span className="eyebrow"> % match for you</span>
              </p>
              <ul className={s.reasons}>
                {matched.length > 0 && (
                  <li>Threads of {matched.slice(0, 2).join(' and ')} run through your library.</li>
                )}
                <li>A {singular(pick.type).toLowerCase()} that sits exactly in your register.</li>
              </ul>
              <div className={s.heroActions}>
                <button
                  className={s.seeWhy}
                  onClick={() => nav(`/item/${encodeURIComponent(pick.id)}`)}
                >
                  See why
                </button>
                <button
                  className={s.saveBtn}
                  onClick={() => toggleSave(pick)}
                >
                  {isSaved(pick.id) ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
            <div className={s.heroCover}>
              <CoverTile item={pick} aspect="1 / 1" />
            </div>
          </section>
        )}

        {threads.map((thread) => (
          <section key={thread.tag} className={s.thread}>
            <div className={s.threadHead}>
              <h3 className={s.threadTitle}>{thread.tag}</h3>
              <span className="eyebrow">a current beneath your favourites</span>
            </div>
            <div className={s.row4}>
              {thread.items.map((it) => (
                <ItemCard key={it.id} item={it} score={it.score} showScore />
              ))}
            </div>
          </section>
        ))}

        <section className={s.thread}>
          <div className={s.threadHead}>
            <h3 className={s.sectionTitle}>Films attuned to you</h3>
            <Link to="/browse/film" className={s.seeAll}>
              See all <ArrowIcon size={14} />
            </Link>
          </div>
          <div className={s.row5}>
            {filmRow.map((it) => (
              <ItemCard key={it.id} item={it} score={it.score} showScore />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

const cxPage = `${s.page} fade-in`
