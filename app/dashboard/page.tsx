import { requireUser } from '@/lib/api-auth'
import { AppShell } from '@/components/app-shell'
import DashboardClient from './client'

export default async function DashboardPage() {
  const result = await requireUser()
  if (!result.ok) {
    return (
      <div className="p-6">
        <p>Unauthorized</p>
        <a className="underline" href="/auth/login">Go to login</a>
      </div>
    )
  }
  const { user } = result

  return (
    <AppShell user={user}>
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-serif font-semibold">Dashboard</h1>
        <DashboardClient user={user} />
      </div>
    </AppShell>
  )
}
