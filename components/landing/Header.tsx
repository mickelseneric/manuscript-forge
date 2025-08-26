'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

const DEMO = [
  { label: 'Author', email: 'author@example.com' },
  { label: 'Editor', email: 'editor@example.com' },
  { label: 'Publisher', email: 'publisher@example.com' },
  { label: 'Reader', email: 'reader@example.com' },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur bg-white/70 dark:bg-neutral-950/60">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-1 rounded">Skip to content</a>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="md:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(v => !v)}>
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="text-lg font-serif font-semibold">Manuscript Forge</Link>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#features" className="hover:underline">Features</a>
          <a href="#how" className="hover:underline">How it works</a>
          <a href="#books" className="hover:underline">Books</a>
          <a href="#authors" className="hover:underline">Authors</a>
        </nav>
        <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
          <Link href="/auth/login" className="mr-2 text-sm underline decoration-amber-400/60 underline-offset-4 hover:decoration-amber-500">Log in</Link>
          {open && (
            <div role="menu" aria-label="Login quick profiles" className="absolute right-0 top-full w-56 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-2">
              {DEMO.map((d) => (
                <form key={d.email} method="POST" action={`/api/auth/login?next=${encodeURIComponent('/dashboard')}`}>
                  <input type="hidden" name="email" value={d.email} />
                  <button type="submit" className="w-full text-left text-sm px-3 py-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">Log in as {d.label}</button>
                </form>
              ))}
            </div>
          )}
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <nav className="max-w-6xl mx-auto px-4 py-3 grid gap-2 text-sm">
            <a href="#features" className="px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900">Features</a>
            <a href="#how" className="px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900">How it works</a>
            <a href="#books" className="px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900">Books</a>
            <a href="#authors" className="px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900">Authors</a>
            <Link href="/dashboard?tab=reader" className="px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900">Browse published</Link>
          </nav>
        </div>
      )}
    </header>
  )
}
