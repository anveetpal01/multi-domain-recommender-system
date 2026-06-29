import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/AuthContext'
import { cx } from '../shared/util'
import s from './Login.module.css'

export default function Login() {
  const { login, register, loginWithGoogle, isAuthed, onboarded } = useAuth()
  const nav = useNavigate()

  const [mode, setMode] = useState('signup')
  const [name, setNameInput] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const googleBtn = useRef(null)

  const isSignup = mode === 'signup'

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) return
    let cancelled = false
    const timer = setInterval(() => {
      if (cancelled) return
      if (window.google?.accounts?.id && googleBtn.current) {
        clearInterval(timer)
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const data = await loginWithGoogle(response.credential)
              nav(data.onboarded ? '/' : '/onboarding')
            } catch (err) {
              setError(err.message || 'Google sign-in failed')
            }
          },
        })
        window.google.accounts.id.renderButton(googleBtn.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'pill',
        })
      }
    }, 120)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (isAuthed) return <Navigate to={onboarded ? '/' : '/onboarding'} replace />

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = isSignup
        ? await register(email, password, name.trim() || email.split('@')[0])
        : await login(email, password)
      nav(data.onboarded ? '/' : '/onboarding')
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
          <img src="/logo.png" alt="Home" className={s.brandImg} />
          <span className={s.est}>EST. 2026</span>
        </div>
        <div className={s.panelBody}>
          <p className={s.kicker}>A personal archive</p>
          <h1 className={s.tagline}>Films, songs, books and articles — as one taste.</h1>
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
            <div ref={googleBtn} className={s.googleBtn} />
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
