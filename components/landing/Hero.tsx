import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.2),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(37,99,235,0.2),transparent_60%)] dark:opacity-40" />
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 relative">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl sm:text-5xl font-serif font-semibold tracking-tight">Publish better books, together.</h1>
          <p className="text-lg text-neutral-700 dark:text-neutral-300">Draft with clarity, collaborate with editors, and publish with confidence. Manuscript Forge brings your team into one elegant workflow.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/auth/login"><Button className="bg-amber-500 hover:bg-amber-600 text-black">Get started</Button></Link>
            <Link href="/dashboard?tab=reader" className="text-sm underline underline-offset-4">Browse published books</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
