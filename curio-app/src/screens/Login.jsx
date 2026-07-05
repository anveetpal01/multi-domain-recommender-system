import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/AuthContext'
import { cx } from '../shared/util'
import s from './Login.module.css'
import { useEffect, useRef } from 'react'

export default function Login() {
  const { login, register, loginWithGoogle, isAuthed, onboarded } = useAuth()
  const nav = useNavigate()
  const googleBtnRef = useRef(null)
  const [mode, setMode] = useState('signup')
  const [name, setNameInput] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      if (window.google && googleBtnRef.current) {
        clearInterval(id)
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: async (res) => {
            try {
              const data = await loginWithGoogle(res.credential)
              nav(data?.onboarded ? '/' : '/onboarding')
            } catch (err) {
              setError(err.message)
            }
          },
        })
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
        })
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  // After every hook — an early return above a hook crashes React on re-render.
  if (isAuthed) return <Navigate to={onboarded ? '/' : '/onboarding'} replace />

  const isSignup = mode === 'signup'

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
      nav(data?.onboarded ? '/' : '/onboarding')
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
            <div ref={googleBtnRef} />
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
