import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLibrary } from '../shared/LibraryContext'
import { DOMAIN_ORDER, DOMAINS } from '../data/catalog'
import { ItemCard } from '../shared/ItemCard'
import { EmptyState } from '../shared/ui'
import s from './Library.module.css'

export default function Library() {
  const { liked } = useLibrary()

  const byDomain = useMemo(() => {
    const map = {}
    DOMAIN_ORDER.forEach((d) => (map[d] = []))
    liked.forEach((it) => {
      if (map[it.type]) map[it.type].push(it)
    })
    return map
  }, [liked])

  return (
    <div className={`${s.page} fade-in`}>
      <div className="container">
        <header className={s.head}>
          <p className="eyebrow">Your collection</p>
          <h1 className={s.title}>Library</h1>
          <p className={s.sub}>
            A calm collection across four domains — and the threads that run between them.
          </p>
        </header>

        {liked.length === 0 ? (
          <EmptyState title="Your library is empty">
            Save films, songs, books and articles — they&apos;ll gather here.{' '}
            <Link to="/browse" className={s.startLink}>
              Start browsing →
            </Link>
          </EmptyState>
        ) : (
          DOMAIN_ORDER.map(
            (d) =>
              byDomain[d].length > 0 && (
                <section key={d} className={s.section}>
                  <div className={s.sectionHead}>
                    <h2 className={s.sectionTitle}>{DOMAINS[d].label}</h2>
                    <span className="eyebrow">{byDomain[d].length} saved</span>
                  </div>
                  <div className={s.grid}>
                    {byDomain[d].map((it) => (
                      <ItemCard key={it.id} item={it} />
                    ))}
                  </div>
                </section>
              ),
          )
        )}
      </div>
    </div>
  )
}
