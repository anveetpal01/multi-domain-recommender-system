import { NavLink, Outlet } from 'react-router-dom'
import { Logo, ThemeToggle } from '../shared/ui'
import { useLibrary } from '../shared/LibraryContext'
import { useAuth } from '../shared/AuthContext'
import { cx } from '../shared/util'
import s from './AppLayout.module.css'

const IconHome = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 11 12 4l8 7" />
    <path d="M6 10v9h12v-9" />
  </svg>
)
const IconBrowse = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.4" />
    <rect x="13" y="4" width="7" height="7" rx="1.4" />
    <rect x="4" y="13" width="7" height="7" rx="1.4" />
    <rect x="13" y="13" width="7" height="7" rx="1.4" />
  </svg>
)
const IconSearch = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)
const IconLibrary = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 4h4v16H5zM11 4h3l3 15-3.8.8z" />
  </svg>
)
const IconTaste = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />
  </svg>
)

const NAV = [
  { to: '/', label: 'Home', n: '01', end: true, Icon: IconHome },
  { to: '/browse', label: 'Browse', n: '02', Icon: IconBrowse },
  { to: '/search', label: 'Search', n: '03', Icon: IconSearch },
  { to: '/library', label: 'Library', n: '04', Icon: IconLibrary },
  { to: '/taste', label: 'Taste', n: '05', Icon: IconTaste },
]

export default function AppLayout() {
  const { liked } = useLibrary()
  const { user, logout } = useAuth()

  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <Logo />
        <nav className={s.nav}>
          {NAV.map(({ to, label, n, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cx(s.navItem, isActive && s.navActive)}
            >
              <Icon className={s.navIcon} width={18} height={18} />
              <span className={s.navLabel}>{label}</span>
              <span className={s.navNum}>{n}</span>
            </NavLink>
          ))}
        </nav>
        <div className={s.foot}>
          <ThemeToggle />
          <div className={s.account}>
            <div className={s.accountInfo}>
              <span className={s.accountName}>{user?.name || 'Account'}</span>
              <span className={s.savedCount}>{liked.length} saved</span>
            </div>
            <button type="button" className={s.logout} onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <header className={s.mobileTop}>
        <Logo sub={null} />
        <ThemeToggle />
      </header>

      <main className={s.main}>
        <Outlet />
      </main>

      <nav className={s.tabbar}>
        {NAV.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cx(s.tab, isActive && s.tabActive)}
          >
            <Icon width={20} height={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
