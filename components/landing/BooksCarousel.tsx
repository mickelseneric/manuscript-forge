"use client"

import { useEffect, useRef, useState } from "react"
import { BookCard } from "./BookCard"

export type FeaturedBook = { id: string; title: string; author: string; status?: "draft"|"editing"|"ready"|"published" }

export function BooksCarousel({ books }: { books: FeaturedBook[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(0)
  const mountedRef = useRef(false)

  const scrollTo = (i: number) => {
    const el = trackRef.current
    if (!el) return
    const child = el.children[i] as HTMLElement | undefined
    if (child) child.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', inline: 'center', block: 'nearest' })
  }

  const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    // Skip the initial mount to avoid auto-scrolling the page to this section
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    scrollTo(index)
  }, [index])

  const next = () => setIndex((i) => Math.min(i + 1, Math.max(books.length - 1, 0)))
  const prev = () => setIndex((i) => Math.max(i - 1, 0))

  return (
    <section id="books" className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-serif font-semibold tracking-tight">Featured Books</h2>
          <p className="text-neutral-600 dark:text-neutral-300">A glimpse of what teams create with Manuscript Forge.</p>
        </div>
        <div className="mt-6 flex items-center gap-2" aria-roledescription="carousel" aria-label="Featured books">
          <button aria-label="Previous" className="rounded-md border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm" onClick={prev}>&larr;</button>
          <div
            ref={trackRef}
            tabIndex={0}
            role="list"
            onKeyDown={(e) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev() }}
            className="flex-1 overflow-x-auto scroll-smooth [scroll-snap-type:x_mandatory] gap-4 flex"
          >
            {books.map((b) => (
              <div role="listitem" key={b.id} className="min-w-[70%] sm:min-w-[40%] lg:min-w-[22%] [scroll-snap-align:center]">
                <BookCard title={b.title} author={b.author} status={b.status} />
              </div>
            ))}
          </div>
          <button aria-label="Next" className="rounded-md border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm" onClick={next}>&rarr;</button>
        </div>
      </div>
    </section>
  )
}
