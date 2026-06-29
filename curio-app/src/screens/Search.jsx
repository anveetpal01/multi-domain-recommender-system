import { useMemo, useState } from 'react'
import { useCatalog } from '../shared/CatalogContext'
import { useLibrary } from '../shared/LibraryContext'
import { withScores } from '../shared/recommender'
import { ItemCard } from '../shared/ItemCard'
import { Pill, SearchIcon, EmptyState } from '../shared/ui'
import { cx } from '../shared/util'
import s from './Search.module.css'

const SUGGESTIONS = [
  'the sea', 'stillness', 'memory', 'maps', 'patience', 'craft', 'light', 'solitude',
]

export default function Search() {
  const { catalog } = useCatalog()
  const { taste } = useLibrary()
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const results = useMemo(() => {
    if (!query) return []
    const list = catalog.filter(
      (i) =>
        i.title.toLowerCase().includes(query) ||
        (i.creator || '').toLowerCase().includes(query) ||
        (i.tags || []).some((t) => t.includes(query)),
    )
    return withScores(list, taste)
      .sort((a, b) => b.score - a.score)
      .slice(0, 48)
  }, [catalog, query, taste])

  return (
    <div className={`${s.page} fade-in`}>
      <div className="container">
        <header className={s.head}>
          <p className="eyebrow">Discover</p>
          <h1 className={s.title}>Search</h1>
        </header>

        <div className={s.bar}>
          <SearchIcon size={18} />
          <input
            autoFocus
            className={s.input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search across films, songs, books and articles…"
            aria-label="Search"
          />
          {q && (
            <button className={s.clear} onClick={() => setQ('')} aria-label="Clear">
              ×
            </button>
          )}
        </div>

        <div className={s.suggestions}>
          {SUGGESTIONS.map((t) => (
            <Pill
              key={t}
              active={query === t}
              onClick={() => setQ(t)}
              className={cx(s.suggestion, 'serif-italic')}
            >
              {t}
            </Pill>
          ))}
        </div>

        {query ? (
          results.length ? (
            <>
              <p className={cx('eyebrow', s.count)}>
                {results.length} result{results.length === 1 ? '' : 's'} across your library
              </p>
              <div className={s.grid}>
                {results.map((it) => (
                  <ItemCard key={it.id} item={it} score={it.score} showScore />
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No threads found">
              Try another word, or tap a suggestion above.
            </EmptyState>
          )
        ) : (
          <p className={s.hint}>Type a title, a name, or a feeling.</p>
        )}
      </div>
    </div>
  )
}
