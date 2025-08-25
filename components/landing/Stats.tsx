import { stats } from './data'

export function Stats() {
  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
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
