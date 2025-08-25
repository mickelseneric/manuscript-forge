import { testimonials } from './data'
import { SectionHeading } from './SectionHeading'

export function Testimonials() {
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeading title="What people say" subtitle="Thoughtful words from teams using Manuscript Forge." />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <figure key={i} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white/70 dark:bg-neutral-900/60 shadow-sm">
              <blockquote className="text-neutral-800 dark:text-neutral-100">“{t.quote}”</blockquote>
              <figcaption className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{t.name} — {t.role}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
