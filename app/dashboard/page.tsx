import { requireUser } from '@/lib/api-auth'

function AuthorTab({ tab }: { tab?: string }) {
  return <div>Author dashboard {tab ? `(tab: ${tab})` : ''}</div>
}
function EditorTab({ tab }: { tab?: string }) {
  return <div>Editor dashboard {tab ? `(tab: ${tab})` : ''}</div>
}
function PublisherTab({ tab }: { tab?: string }) {
  return <div>Publisher dashboard {tab ? `(tab: ${tab})` : ''}</div>
}
function ReaderTab({ tab }: { tab?: string }) {
  return <div>Reader dashboard {tab ? `(tab: ${tab})` : ''}</div>
}

export default async function DashboardPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const result = await requireUser()
  if (!result.ok) {
    // Middleware should prevent this, but we keep a fallback
    return (
      <div className="p-6">
        <p>Unauthorized</p>
        <a className="underline" href="/auth/login">Go to login</a>
      </div>
    )
  }
  const { user } = result
  const tab = typeof searchParams?.tab === 'string' ? searchParams.tab : undefined

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="text-sm text-neutral-600 dark:text-neutral-300">Signed in as {user.name} ({user.email}) — {user.role}</div>
        </div>
        <form method="POST" action="/api/auth/logout?next=/auth/login">
          <button className="underline text-sm" type="submit">Logout</button>
        </form>
      </div>

      {user.role === 'Author' && <AuthorTab tab={tab} />}
      {user.role === 'Editor' && <EditorTab tab={tab} />}
      {user.role === 'Publisher' && <PublisherTab tab={tab} />}
      {user.role === 'Reader' && <ReaderTab tab={tab} />}

      <div className="text-sm text-neutral-600 dark:text-neutral-300">
        Use the tab query for deep links, e.g. /dashboard?tab=editor
      </div>
    </div>
  )
}
