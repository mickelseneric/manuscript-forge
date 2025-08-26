"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Book, Home, LogOut } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import toast, { Toaster } from "react-hot-toast"
import { useQuery, useQueryClient } from "@tanstack/react-query"

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { id: string; name: string; email: string; role: string }
}) {
  const pathname = usePathname()
  const [openNotif, setOpenNotif] = useState(false)
  const qc = useQueryClient()
  const notifRef = useRef<HTMLDivElement | null>(null)

  // This AppShell only renders on authenticated routes (middleware + requireUser),
  // so we can safely enable notifications queries and SSE without checking cookies.

  // Data: unread count and latest notifications
  const unreadQuery = useQuery({
    queryKey: ['notifications','unread-count'],
    queryFn: async () => {
      const r = await fetch('/api/notifications/unread-count')
      if (!r.ok) throw new Error('Failed')
      return r.json() as Promise<{ count: number }>
    },
    refetchInterval: 30_000,
  })

  const listQuery = useQuery({
    queryKey: ['notifications','list'],
    queryFn: async () => {
      const r = await fetch('/api/notifications?unread=true&limit=20')
      if (!r.ok) throw new Error('Failed')
      return r.json() as Promise<{ items: { id:string; title:string; body:string; bookId:string; createdAt:string; readAt:string|null }[] }>
    },
    staleTime: 10_000,
  })

  const unread = unreadQuery.data?.count || 0

  // SSE: connect to authorized stream
  useEffect(() => {
    let es: EventSource | null = null
    try {
      es = new EventSource('/api/events/stream')
      es.addEventListener('notification.created', () => {
        qc.invalidateQueries({ queryKey: ['notifications','unread-count'] })
        qc.invalidateQueries({ queryKey: ['notifications','list'] })
      })
      es.addEventListener('books.statusChanged', (e: MessageEvent) => {
        // Invalidate specific queues based on payload
        try {
          const data = JSON.parse(e.data || '{}') as { from?: string; to?: string }
          if (data?.from) qc.invalidateQueries({ queryKey: ['books', data.from] })
          if (data?.to) qc.invalidateQueries({ queryKey: ['books', data.to] })
        } catch {}
        // Also invalidate generic and notifications (worker lag safe)
        qc.invalidateQueries({ queryKey: ['books'] })
        qc.invalidateQueries({ queryKey: ['notifications','unread-count'] })
        qc.invalidateQueries({ queryKey: ['notifications','list'] })
      })
      es.onerror = () => { es?.close() }
    } catch {
      // no-op
    }
    return () => es?.close()
  }, [qc])

  // Close notifications when clicking outside the popup
  useEffect(() => {
    if (!openNotif) return
    function onDocClick(e: MouseEvent) {
      const el = notifRef.current
      if (el && !el.contains(e.target as Node)) {
        setOpenNotif(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openNotif])

  async function markAllRead() {
      // Close the popup immediately after clicking
      setOpenNotif(false)
    // Optimistic: set unread to 0 by updating cache
    const prev = unreadQuery.data
    qc.setQueryData(['notifications','unread-count'], { count: 0 })
    try {
      const r = await fetch('/api/notifications/read-all', { method: 'POST' })
      if (!r.ok) throw new Error('Failed')
      qc.invalidateQueries({ queryKey: ['notifications','list'] })
      qc.invalidateQueries({ queryKey: ['notifications','unread-count'] })
    } catch {
      if (prev) qc.setQueryData(['notifications','unread-count'], prev)
      toast.error('Failed to mark as read')
    }
  }

  const nav = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/dashboard/books", label: "Books", icon: Book },
    ],
    []
  )

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] grid-rows-[56px_1fr] bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Sidebar */}
      <aside className="row-span-2 hidden md:block border-r border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur">
        <div className="px-4 py-4">
          <div className="text-xl font-serif font-semibold">Manuscript Forge</div>
        </div>
        <nav className="px-2 space-y-1">
          {nav.map((item) => (
            <Link href={item.href} key={item.href} className={cn("flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800", pathname === item.href && "bg-neutral-100 dark:bg-neutral-800")}> 
              <item.icon className="h-4 w-4" aria-hidden />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Topbar */}
      <header className="col-span-2 md:col-span-1 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur">
        <div className="md:hidden text-lg font-serif font-semibold">Manuscript Forge</div>
        <div className="flex items-center gap-2">

          <div ref={notifRef} className="relative">
            <Button aria-label="Notifications" variant="ghost" size="icon" onClick={() => setOpenNotif((v) => !v)}>
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span aria-label={`${unread} unread`} className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white px-1">
                  {unread}
                </span>
              )}
            </Button>
            {openNotif && (
              <div role="menu" aria-label="Notifications" className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1rem))] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg z-50">
                <div className="flex items-center justify-between p-2">
                  <div className="text-sm font-medium">Notifications</div>
                  <button className="text-xs underline" onClick={markAllRead}>Mark all read</button>
                </div>
                <div className="max-h-80 overflow-auto divide-y divide-neutral-200 dark:divide-neutral-800">
                  {(!listQuery.data || listQuery.data.items.length === 0) ? (
                    <div className="p-3 text-sm text-neutral-500">No notifications</div>
                  ) : listQuery.data.items.map((n) => (
                    <div key={n.id} className={cn("p-3 text-sm", !n.readAt && "bg-blue-50/50 dark:bg-blue-950/20")}>{n.title}<div className="text-xs text-neutral-500">{n.body}</div></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-600 to-blue-700 text-white flex items-center justify-center text-xs font-semibold" aria-label="User avatar">
            {user.name.split(' ').map((s) => s[0]).join('').slice(0,2)}
          </div>
          <div className="hidden sm:flex flex-col leading-tight mr-2">
            <span className="text-sm">{user.name}</span>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">{user.role}</Badge>
          </div>
          <form method="POST" action="/api/auth/logout?next=/auth/login">
            <Button variant="ghost" size="icon" aria-label="Logout"><LogOut className="h-4 w-4" /></Button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {children}
        <Toaster position="top-right" />
      </main>
    </div>
  )
}
