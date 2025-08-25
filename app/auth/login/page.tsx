'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const DEMO_EMAILS = [
  { label: 'Author', email: 'author@example.com' },
  { label: 'Editor', email: 'editor@example.com' },
  { label: 'Publisher', email: 'publisher@example.com' },
  { label: 'Reader', email: 'reader@example.com' },
]

export default function LoginPage() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const [email, setEmail] = useState('')

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Login</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Enter your email to sign in. Or use one of the demo users.
      </p>
      <form className="space-y-4" method="POST" action={`/api/auth/login?next=${encodeURIComponent(next)}`}>
        <label className="block">
          <span className="block text-sm mb-1">Email</span>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white text-black dark:bg-neutral-900 dark:text-white"
            placeholder="you@example.com"
          />
        </label>
        <Button type="submit" className="w-full">Sign in</Button>
      </form>

      <div>
        <div className="text-sm mb-2">Demo users</div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_EMAILS.map((d) => (
            <Button key={d.email} type="button" variant="secondary" onClick={() => setEmail(d.email)}>
              {d.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
