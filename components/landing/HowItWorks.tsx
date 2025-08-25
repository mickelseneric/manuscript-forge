import { SectionHeading } from './SectionHeading'

const steps = [
  { title: 'Author drafts', copy: 'Start a manuscript and iterate in peace.' },
  { title: 'Editor marks ready', copy: 'Move from editing to ready when it shines.' },
  { title: 'Publisher releases', copy: 'Publish and share with your readers.' },
  { title: 'Readers review', copy: 'Gather feedback to inform your next release.' },
]

export function HowItWorks() {
  return (
    <section id="how" className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeading title="How it works" subtitle="A simple, auditable flow from draft to published." />
        <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white/70 dark:bg-neutral-900/60 shadow-sm">
              <div className="text-sm text-neutral-500">Step {i + 1}</div>
              <div className="mt-1 font-serif font-semibold">{s.title}</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-300">{s.copy}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
