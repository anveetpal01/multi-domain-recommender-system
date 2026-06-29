import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/AuthContext'
import { useLibrary } from '../shared/LibraryContext'
import { cx } from '../shared/util'
import s from './Login.module.css'
import { useEffect, useRef } from 'react'
const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-2 3.2-4.9 3.2-7.9z" />
    <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M6 14.4a6.6 6.6 0 0 1 0-4.2V7.4H2.3a11 11 0 0 0 0 9.8z" />
    <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.4L6 10.2c.9-2.6 3.2-4.8 6-4.8z" />
  </svg>
)

export default function Login() {
  const { login, register, loginWithGoogle, isAuthed } = useAuth()
  const { setName, onboarded } = useLibrary()
  const nav = useNavigate()
  const googleBtnRef = useRef(null)
  const [mode, setMode] = useState('signup')
  const [name, setNameInput] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAuthed) return <Navigate to={onboarded ? '/' : '/onboarding'} replace />

  const isSignup = mode === 'signup'

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  useEffect(() => {
  const id = setInterval(() => {
    if (window.google && googleBtnRef.current) {
      clearInterval(id)
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (res) => {
          try {
            const data = await loginWithGoogle(res.credential)
            setName(data.name)
            nav(onboarded ? '/' : '/onboarding')
          } catch (err) {
            setError(err.message)
          }
        },
      })
      window.google.accounts.id.renderButton(googleBtn.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      })
    }
  }, 100)
  return () => clearInterval(id)
}, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = isSignup
        ? await register(email, password, name.trim() || email.split('@')[0])
        : await login(email, password)
      setName(data.name)
      nav(onboarded ? '/' : '/onboarding')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={s.wrap}>
      <section className={s.panel}>
        <div className={s.panelTop}>
          <span className={s.brand}>Curio</span>
          <span className={s.est}>EST. 2026</span>
        </div>
        <div className={s.panelBody}>
          <p className={s.kicker}>A personal archive</p>
          <h1 className={s.tagline}>Films, songs, books and essays — as one taste.</h1>
        </div>
        <p className={s.panelFoot}>A library that learns you.</p>
      </section>

      <section className={s.formSide}>
        <div className={s.form}>
          <div className={s.modeTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              className={cx(s.modeTab, !isSignup && s.modeTabActive)}
              onClick={() => switchMode('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              className={cx(s.modeTab, isSignup && s.modeTabActive)}
              onClick={() => switchMode('signup')}
            >
              Create account
            </button>
          </div>

          <h2 className={s.formTitle}>{isSignup ? 'Create your library' : 'Welcome back'}</h2>
          <p className={s.formSub}>
            {isSignup ? 'One account for everything you love.' : 'Sign in to your library.'}
          </p>

          <div className={s.oauth}>
            <button type="button" className={s.oauthBtn} onClick={socialSoon}>
              <GoogleMark /> Continue with Google
            </button>
          </div>

          <div className={s.divider}>
            <span>or</span>
          </div>

          <form onSubmit={submit}>
            {isSignup && (
              <input
                type="text"
                className={s.input}
                placeholder="Your name"
                value={name}
                onChange={(e) => setNameInput(e.target.value)}
                aria-label="Name"
                autoComplete="name"
              />
            )}
            <input
              type="email"
              className={s.input}
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
              autoComplete="email"
              required
            />
            <input
              type="password"
              className={s.input}
              placeholder={isSignup ? 'Password (min 8 characters)' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
            />

            {error && <p className={s.error}>{error}</p>}

            <button type="submit" className={s.cta} disabled={busy}>
              {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className={s.signin}>
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              className={s.signinLink}
              onClick={() => switchMode(isSignup ? 'signin' : 'signup')}
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}
