import { SectionHeading } from './SectionHeading'
import { CheckCircle2, Bell, Users, Newspaper, PenSquare, Send } from 'lucide-react'

const features = [
  { icon: PenSquare, title: 'Draft & Collaborate', copy: 'Write in comfort and share drafts for feedback when you are ready.' },
  { icon: CheckCircle2, title: 'Editorial Workflow', copy: 'Move from draft to editing to ready, with clear ownership.' },
  { icon: Send, title: 'Publish with Confidence', copy: 'Simple, auditable transitions to published.' },
  { icon: Newspaper, title: 'Reader Reviews', copy: 'Gather impressions and ratings once books are live.' },
  { icon: Bell, title: 'Notifications', copy: 'Keep your team informed about status changes.' },
  { icon: Users, title: 'Role-based access', copy: 'Authors, Editors, Publishers, and Readers each see what matters.' },
]

export function FeatureCards() {
  return (
    <section id="features" className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeading title="Workflows that feel natural" subtitle="Everything you need to draft, review, and publish—without the chaos." />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white/70 dark:bg-neutral-900/60 shadow-sm">
              <f.icon aria-hidden className="h-5 w-5 text-emerald-600" />
              <div className="mt-3 font-serif font-semibold">{f.title}</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-300">{f.copy}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
