import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLibrary } from './LibraryContext'
import { accentFor, DOMAINS } from '../data/catalog'
import { coverLetter, cx } from './util'
import { SaveIcon } from './ui'
import s from './ItemCard.module.css'

const singular = (type) => {
  const label = DOMAINS[type]?.label || type
  return label.endsWith('s') ? label.slice(0, -1) : label
}

export function CoverTile({ item, className, aspect }) {
  const [err, setErr] = useState(false)
  const showImg = item.cover && !err
  const style = {}
  if (aspect) style.aspectRatio = aspect
  if (!showImg) style['--tile'] = accentFor(item.type)
  return (
    <div
      className={cx(s.cover, !showImg && s.letter, className)}
      style={style}
    >
      {showImg ? (
        <img src={item.cover} alt="" loading="lazy" onError={() => setErr(true)} />
      ) : (
        <span className={s.letterGlyph}>{coverLetter(item)}</span>
      )}
    </div>
  )
}

export function ItemCard({ item, score = null, showScore = false }) {
  const { isSaved, toggleSave } = useLibrary()
  const saved = isSaved(item.id)
  return (
    <article className={s.card}>
      <Link to={`/item/${encodeURIComponent(item.id)}`} className={s.link}>
        <div className={s.coverWrap}>
          <CoverTile item={item} />
          {showScore && score != null && (
            <span className={s.scoreChip}>
              {score}
              <i>%</i>
            </span>
          )}
          <button
            type="button"
            className={cx(s.save, saved && s.saved)}
            onClick={(e) => {
              e.preventDefault()
              toggleSave(item)
            }}
            aria-pressed={saved}
            aria-label={saved ? 'Saved to library' : 'Save to library'}
          >
            <SaveIcon filled={saved} />
          </button>
        </div>
        <div className={s.body}>
          <span className={s.domain}>{singular(item.type)}</span>
          <h3 className={s.title}>{item.title}</h3>
          {item.creator && <p className={s.creator}>{item.creator}</p>}
        </div>
      </Link>
    </article>
  )
}
