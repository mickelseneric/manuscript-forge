import { Badge } from "@/components/ui/badge"

export function BookCard({ title, author, status }: { title: string; author: string; status?: string }) {
  return (
    <div className="group overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-neutral-900 dark:to-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
      <div aria-hidden className="mb-3 h-40 rounded-xl bg-[radial-gradient(ellipse_at_top_left,theme(colors.emerald.200),transparent_60%),radial-gradient(ellipse_at_bottom_right,theme(colors.blue.200),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.15),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.15),transparent_60%)]" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-serif font-semibold leading-snug">{title}</div>
          <div className="text-xs text-neutral-500">by {author}</div>
        </div>
      </div>
    </div>
  )
}
