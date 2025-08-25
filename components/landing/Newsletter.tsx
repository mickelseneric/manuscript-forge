"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setTimeout(() => setDone(true), 300) // client-only success
  }

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mx-auto max-w-xl text-center">
          <h3 className="text-2xl font-serif font-semibold">Get product updates</h3>
          <p className="text-neutral-600 dark:text-neutral-300">Occasional news—no spam, unsubscribe anytime.</p>
          {done ? (
            <div className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100 p-3 text-sm">Thanks! You’re on the list.</div>
          ) : (
            <form onSubmit={submit} className="mt-4 flex gap-2 justify-center">
              <Input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-xs" />
              <Button className="bg-amber-500 hover:bg-amber-600 text-black">Subscribe</Button>
            </form>
          )}
          <div className="mt-2 text-xs text-neutral-500">By subscribing, you consent to receive updates.</div>
        </div>
      </div>
    </section>
  )
}
