"use client"

import { useState } from 'react'
import { faqs } from './data'

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h3 className="text-2xl font-serif font-semibold text-center">Frequently asked questions</h3>
        <div className="mt-6 mx-auto max-w-2xl divide-y divide-neutral-200 dark:divide-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60">
          {faqs.map((f, i) => (
            <div key={f.q}>
              <button
                aria-expanded={open === i}
                className="w-full text-left px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <div className="font-medium">{f.q}</div>
              </button>
              {open === i && <div className="px-4 pb-4 text-sm text-neutral-600 dark:text-neutral-300">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
