import { Link } from 'react-router-dom'
import { useTheme } from './ThemeContext'
import { cx } from './util'
import s from './ui.module.css'

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className={s.logo}>
      <img src="/logo.png" alt="Home" className={s.logoImg} />
    </Link>
  )
}

export function Pill({ active, children, onClick, as = 'button', className, ...rest }) {
  const Cmp = as
  return (
    <Cmp
      className={cx(s.pill, active && s.pillActive, className)}
      onClick={onClick}
      {...(as === 'button' ? { type: 'button' } : {})}
      {...rest}
    >
      {children}
    </Cmp>
  )
}

export function ThemeToggle() {
  const { theme, setTheme, themes } = useTheme()
  return (
    <div className={s.themeToggle} role="group" aria-label="Colour theme">
      {themes.map((t) => (
        <button
          key={t.key}
          type="button"
          className={cx(s.swatch, s[`sw_${t.key}`], theme === t.key && s.swatchActive)}
          onClick={() => setTheme(t.key)}
          aria-pressed={theme === t.key}
          aria-label={t.label}
          title={t.label}
        />
      ))}
    </div>
  )
}

export function MatchBadge({ score, size = 'sm' }) {
  if (score == null) return null
  return (
    <span className={cx(s.match, size === 'lg' && s.matchLg)}>
      <b>{score}</b>
      <i className="eyebrow">% match</i>
    </span>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className={s.empty}>
      <h3 className="display">{title}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}

export const SaveIcon = ({ filled = false, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
  </svg>
)

export const SearchIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const ArrowIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
