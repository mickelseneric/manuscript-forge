import prisma from '@/lib/prisma'
import { BookStatus } from '@prisma/client'

function formatNumber(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
  } catch {
    return String(n)
  }
}

export async function Stats() {
  // Fetch dynamic stats with graceful fallback when DB is unavailable
  let published = 0
  let reviews = 0
  try {
    [published, reviews] = await Promise.all([
      prisma.book.count({ where: { status: BookStatus.published } }),
      prisma.review.count(),
    ])
  } catch {
    // Leave 0s on any error (e.g., no DATABASE_URL during static build/tests)
  }

  const items = [
    { label: 'Concurrent users supported', value: '1K+' },
    { label: 'Books published', value: formatNumber(published) },
    { label: 'Reviews', value: formatNumber(reviews) },
    { label: 'Uptime', value: '99.9%' },
  ]

  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {items.map((s) => (
            <div key={s.label} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-center bg-white/70 dark:bg-neutral-900/60 shadow-sm">
              <div className="text-2xl font-serif font-semibold">{s.value}</div>
              <div className="text-xs text-neutral-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
