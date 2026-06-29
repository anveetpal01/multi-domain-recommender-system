import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCatalog } from '../shared/CatalogContext'
import { useLibrary } from '../shared/LibraryContext'
import { withScores } from '../shared/recommender'
import { DOMAIN_ORDER, DOMAINS, TAGS } from '../data/catalog'
import { ItemCard } from '../shared/ItemCard'
import { Pill, EmptyState } from '../shared/ui'
import s from './Browse.module.css'

const SORTS = [
  { key: 'match', label: 'Best match' },
  { key: 'new', label: 'Newest' },
  { key: 'az', label: 'A–Z' },
]

export default function Browse() {
  const { domain } = useParams()
  const nav = useNavigate()
  const { catalog } = useCatalog()
  const { taste } = useLibrary()

  const active = DOMAINS[domain] ? domain : 'film'
  const [tag, setTag] = useState('all')
  const [sort, setSort] = useState('match')

  const tagsInDomain = useMemo(() => {
    const set = new Set()
    catalog
      .filter((i) => i.type === active)
      .forEach((i) => (i.tags || []).forEach((t) => set.add(t)))
    return TAGS.filter((t) => set.has(t)).slice(0, 7)
  }, [catalog, active])

  const items = useMemo(() => {
    let list = catalog.filter((i) => i.type === active)
    if (tag !== 'all') list = list.filter((i) => (i.tags || []).includes(tag))
    list = withScores(list, taste)
    if (sort === 'match') list.sort((a, b) => b.score - a.score)
    else if (sort === 'new') list.sort((a, b) => (b.year || 0) - (a.year || 0))
    else list.sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [catalog, active, tag, sort, taste])

  const changeDomain = (d) => {
    setTag('all')
    nav(`/browse/${d}`)
  }

  return (
    <div className={`${s.page} fade-in`}>
      <div className="container">
        <header className={s.head}>
          <p className="eyebrow">Browse</p>
          <h1 className={s.title}>{DOMAINS[active].label}</h1>
          <p className={s.sub}>
            Recommended for you across the {DOMAINS[active].label.toLowerCase()} in your
            library.
          </p>
        </header>

        <div className={s.tabs}>
          {DOMAIN_ORDER.map((d) => (
            <Pill key={d} active={active === d} onClick={() => changeDomain(d)}>
              {DOMAINS[d].label}
            </Pill>
          ))}
        </div>

        <div className={s.controls}>
          <div className={s.filters}>
            <Pill active={tag === 'all'} onClick={() => setTag('all')}>
              All
            </Pill>
            {tagsInDomain.map((t) => (
              <Pill key={t} active={tag === t} onClick={() => setTag(t)}>
                {t}
              </Pill>
            ))}
          </div>
          <label className={s.sort}>
            <span className="eyebrow">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {items.length ? (
          <div className={s.grid}>
            {items.map((it) => (
              <ItemCard key={it.id} item={it} score={it.score} showScore />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing here yet">
            Try a different thread or domain.
          </EmptyState>
        )}
      </div>
    </div>
  )
}
