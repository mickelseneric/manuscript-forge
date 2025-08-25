import { logoNames } from './data'

export function LogoStrip() {
  return (
    <section aria-label="Trusted by" className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center text-sm font-medium text-neutral-500 mb-4">Trusted by teams and imprints</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 items-center justify-items-center">
          {logoNames.map((name) => (
            <div key={name} className="h-8 w-40 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-400 text-xs">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
