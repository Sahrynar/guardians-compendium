import { useEffect, useState } from 'react'
import { supabase, hasSupabase } from '../supabase'

// Gates the entire app behind Supabase Auth when Supabase is configured.
// - No Supabase env vars → pass-through (localStorage-only mode unchanged)
// - Session persists in localStorage (supabase-js default), so sign-in is
//   roughly once per device. Tokens auto-refresh.
// - App (and useDB) never mounts until authenticated, so once RLS is on,
//   every DB call carries the user's token.
export default function LoginGate({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still checking
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!hasSupabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!hasSupabase) return children
  if (session) return children

  const signIn = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (busy) return
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    if (error) { setErr(error.message); setBusy(false) }
    // On success onAuthStateChange sets the session and children render.
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      {session === undefined ? (
        <div style={{ fontSize: '2.46em', color: 'var(--cc)' }}>✦</div>
      ) : (
        <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
          <div style={{ fontSize: '2.46em', marginBottom: 10 }}>✦</div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.15em',
            color: 'var(--cc)', marginBottom: 4 }}>Guardians Compendium</div>
          <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginBottom: 22 }}>
            Keeper sign-in</div>
          <input className="sx" type="email" autoComplete="username" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && signIn()}
            style={{ width: '100%', marginBottom: 10 }} />
          <input className="sx" type="password" autoComplete="current-password" placeholder="Password"
            value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && signIn()}
            style={{ width: '100%', marginBottom: 14 }} />
          {err && <div style={{ fontSize: '0.77em', color: '#ff6666', marginBottom: 12 }}>{err}</div>}
          <button className="btn" onClick={signIn} disabled={busy}
            style={{ width: '100%', padding: '9px 0', background: 'var(--cc)', color: '#000',
              fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Signing in…' : 'Enter'}
          </button>
        </div>
      )}
    </div>
  )
}
