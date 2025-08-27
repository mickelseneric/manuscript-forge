export class APIError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

export async function fetchJSON<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(input, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }, ...init })
  if (res.status === 401) {
    // Protected pages will redirect via middleware; for client actions, route to login
    if (typeof window !== 'undefined') {
      const next = window.location.pathname + window.location.search
      window.location.href = `/auth/login?next=${encodeURIComponent(next)}`
    }
    throw new APIError('Unauthenticated', 401)
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new APIError(msg || 'Request failed', res.status)
  }
  return res.json() as Promise<T>
}
