import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCatalog } from '../shared/CatalogContext'
import { useLibrary } from '../shared/LibraryContext'
import { useAuth } from '../shared/AuthContext'
import { DOMAIN_ORDER, DOMAINS } from '../data/catalog'
import { CoverTile } from '../shared/ItemCard'
import { Pill, CheckIcon } from '../shared/ui'
import { cx } from '../shared/util'
import s from './Onboarding.module.css'

const PER_DOMAIN = 8

export default function Onboarding() {
  const { catalog } = useCatalog()
  const { toggleSave, isSaved } = useLibrary()
  const { setOnboarded } = useAuth()
  const nav = useNavigate()
  const [tab, setTab] = useState('film')
  const [picks, setPicks] = useState({})

  const items = useMemo(
    () => catalog.filter((i) => i.type === tab).slice(0, PER_DOMAIN),
    [catalog, tab],
  )

  const count = Object.keys(picks).length

  const toggle = (item) =>
    setPicks((p) => {
      const next = { ...p }
      if (next[item.id]) delete next[item.id]
      else next[item.id] = item
      return next
    })

  const finish = async () => {
    await Promise.all(
      Object.values(picks).map((it) => (isSaved(it.id) ? null : toggleSave(it))),
    )
    await setOnboarded()
    nav('/')
  }

  return (
    <div className={s.wrap}>
      <div className={s.inner}>
        <header className={s.head}>
          <img src="/logo.png" alt="Home" className={s.brandImg} />
          <p className="eyebrow">Getting started</p>
          <h1 className={s.title}>Pick a few you love</h1>
          <p className={s.sub}>
            We&apos;ll trace the connections between them. Choose at least three.
          </p>
        </header>

        <div className={s.tabs}>
          {DOMAIN_ORDER.map((d) => (
            <Pill key={d} active={tab === d} onClick={() => setTab(d)}>
              {DOMAINS[d].label}
            </Pill>
          ))}
        </div>

        <div className={s.grid}>
          {items.map((item) => {
            const on = !!picks[item.id]
            return (
              <button
                key={item.id}
                type="button"
                className={cx(s.cell, on && s.cellOn)}
                onClick={() => toggle(item)}
                aria-pressed={on}
              >
                <div className={s.cellCover}>
                  <CoverTile item={item} aspect="1 / 1" />
                  <span className={cx(s.check, on && s.checkOn)}>
                    {on && <CheckIcon />}
                  </span>
                </div>
                <div className={s.cellBody}>
                  <h3>{item.title}</h3>
                  {item.creator && <p>{item.creator}</p>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <button type="button" className={s.back} onClick={() => nav('/login')}>
            Back
          </button>
          <button
            type="button"
            className={s.continue}
            disabled={count < 3}
            onClick={finish}
          >
            Continue {count > 0 && <span className={s.countTag}>· {count} chosen</span>}
          </button>
        </div>
      </footer>
    </div>
  )
}
