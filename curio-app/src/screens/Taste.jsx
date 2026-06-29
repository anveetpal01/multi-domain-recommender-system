import { useEffect, useMemo, useState } from 'react'
import { useLibrary } from '../shared/LibraryContext'
import { useAuth } from '../shared/AuthContext'
import { topTags } from '../shared/recommender'
import { DOMAIN_ORDER, DOMAINS, accentFor } from '../data/catalog'
import { cx } from '../shared/util'
import s from './Taste.module.css'

const SETTINGS_KEY = 'curio-settings-v1'
const DEFAULTS = { score: true, explain: true, cross: true }
const TOGGLES = [
  { key: 'score', label: 'Show match scores', desc: 'Display the % match on every recommendation.' },
  { key: 'explain', label: 'Explain recommendations', desc: 'Show the reason something was suggested.' },
  { key: 'cross', label: 'Cross-domain suggestions', desc: 'Recommend films from books, songs from articles, and so on.' },
]

export default function Taste() {
  const { liked, taste } = useLibrary()
  const { logout } = useAuth()

  const tags = useMemo(() => topTags(taste, 12), [taste])
  const maxW = Math.max(1, ...tags.map((t) => t.weight))
  const senses = Object.keys(taste).length
  const threads = Object.values(taste).reduce((a, b) => a + b, 0)
  const counts = useMemo(
    () => DOMAIN_ORDER.map((d) => ({ d, n: liked.filter((i) => i.type === d).length })),
    [liked],
  )
  const maxCount = Math.max(1, ...counts.map((c) => c.n))

  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || DEFAULTS
    } catch {
      return DEFAULTS
    }
  })
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])
  const toggle = (k) => setSettings((p) => ({ ...p, [k]: !p[k] }))

  return (
    <div className={`${s.page} fade-in`}>
      <div className="container">
        <header className={s.head}>
          <p className="eyebrow">Your taste</p>
          <h1 className={s.title}>Taste profile</h1>
        </header>

        <div className={s.layout}>
          <div className={s.left}>
            <div className={s.cloud}>
              {tags.map((t) => (
                <span
                  key={t.tag}
                  className={s.word}
                  style={{ fontSize: `${16 + (t.weight / maxW) * 30}px` }}
                >
                  {t.tag}
                </span>
              ))}
            </div>

            <div className={s.bars}>
              <p className="eyebrow">Across domains</p>
              {counts.map(({ d, n }) => (
                <div key={d} className={s.bar}>
                  <span className={s.barLabel}>{DOMAINS[d].label}</span>
                  <span className={s.track}>
                    <span
                      className={s.fill}
                      style={{
                        width: `${(n / maxCount) * 100}%`,
                        background: accentFor(d),
                      }}
                    />
                  </span>
                  <span className={s.barCount}>{n}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className={s.right}>
            <div className={s.stats}>
              <div className={s.stat}>
                <span className={s.statNum}>{senses}</span>
                <span className="eyebrow">senses</span>
              </div>
              <div className={s.stat}>
                <span className={s.statNum}>{threads}</span>
                <span className="eyebrow">threads</span>
              </div>
            </div>

            <div className={s.settings}>
              <p className="eyebrow">How Curio recommends</p>
              {TOGGLES.map(({ key, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  className={s.setting}
                  onClick={() => toggle(key)}
                  aria-pressed={settings[key]}
                >
                  <span className={s.settingText}>
                    <span className={s.settingLabel}>{label}</span>
                    <span className={s.settingDesc}>{desc}</span>
                  </span>
                  <span className={cx(s.switch, settings[key] && s.switchOn)}>
                    <span className={s.knob} />
                  </span>
                </button>
              ))}
            </div>

            <button className={s.reset} onClick={logout}>
              Sign out
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}
