import { cn } from "@/lib/utils"

export function SectionHeading({ title, subtitle, id, className }: { title: string; subtitle?: string; id?: string; className?: string }) {
  return (
    <div id={id} className={cn("mx-auto max-w-3xl text-center space-y-2", className)}>
      <h2 className="text-3xl sm:text-4xl font-serif font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="text-neutral-600 dark:text-neutral-300">{subtitle}</p>}
    </div>
  )
}
