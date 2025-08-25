'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const DEMO_USERS = [
  { label: 'Author', username: 'author@example.com', password: 'demo123' },
  { label: 'Editor', username: 'editor@example.com', password: 'demo123' },
  { label: 'Publisher', username: 'publisher@example.com', password: 'demo123' },
  { label: 'Reader', username: 'reader@example.com', password: 'demo123' },
]

export default function LoginPage() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Login</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Enter your username and password to sign in. Or use one of the demo users to auto-fill credentials.
      </p>
      <form className="space-y-4" method="POST" action={`/api/auth/login?next=${encodeURIComponent(next)}`}>
        <label className="block">
          <span className="block text-sm mb-1">Username or email</span>
          <input
            type="text"
            name="email"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-neutral-900 dark:text-white"
            placeholder="you@example.com"
            autoComplete="username"
          />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Password</span>
          <input
            type="password"
            name="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-neutral-900 dark:text-white"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>
        <Button type="submit" className="w-full">Sign in</Button>
      </form>

      <div>
        <div className="text-sm mb-2">Demo users</div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_USERS.map((d) => (
            <Button
              key={d.username}
              type="button"
              variant="secondary"
              onClick={() => { setUsername(d.username); setPassword(d.password) }}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
