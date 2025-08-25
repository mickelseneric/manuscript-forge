import { cn } from "@/lib/utils"

export function Badge({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200", className)}>
      {children}
    </span>
  )
}
