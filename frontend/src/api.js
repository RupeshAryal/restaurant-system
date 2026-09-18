export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const TOKEN_KEY = 'ledger_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class UnauthorizedError extends Error {}

// FastAPI error bodies are usually {detail: "some string"}, but pydantic
// validation failures (422s) come back as {detail: [{msg, loc, ...}, ...]} —
// stringifying that array directly renders as "[object Object]", so pull
// out the human-readable messages instead.
function extractErrorMessage(body, fallback) {
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const msgs = detail.map((d) => d.msg || JSON.stringify(d)).filter(Boolean)
    if (msgs.length) return msgs.join('; ')
  }
  return fallback
}

export async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = 'Bearer ' + token

  const res = await fetch(API_BASE + path, { ...opts, headers })

  if (res.status === 401) {
    setToken(null)
    throw new UnauthorizedError('Your session expired — please sign in again.')
  }
  if (!res.ok) {
    let message = 'Request failed'
    try {
      const body = await res.json()
      message = extractErrorMessage(body, message)
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  return res
}

export async function login(username, password) {
  const res = await fetch(API_BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractErrorMessage(body, 'Sign-in failed'))
  }
  return res.json()
}

export async function checkHealth() {
  try {
    const res = await fetch(API_BASE + '/api/health')
    return res.ok
  } catch {
    return false
  }
}
