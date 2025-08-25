export function AuthorCard({ name, bio }: { name: string; bio: string }) {
  const initials = name.split(' ').map(s => s[0]).join('').slice(0,2)
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white/70 dark:bg-neutral-900/60 shadow-sm">
      <div aria-label={`${name} avatar`} className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-600 to-blue-700 text-white flex items-center justify-center text-sm font-semibold">{initials}</div>
      <div>
        <div className="font-serif font-semibold leading-tight">{name}</div>
        <div className="text-sm text-neutral-600 dark:text-neutral-300">{bio}</div>
      </div>
    </div>
  )
}
