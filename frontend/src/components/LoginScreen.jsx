import { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay open" style={{ background: 'var(--ink)', alignItems: 'center' }}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="serif" style={{ fontSize: 22, fontWeight: 600 }}>
            帳場 Ledger
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Sign in to your restaurant accounts</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Username</label>
            <input type="text" autoComplete="username" required autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
