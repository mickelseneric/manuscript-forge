"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Book, Home, LogOut, Moon, Sun, User2 } from "lucide-react"
import { toggleTheme } from "./providers/theme-provider"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import toast, { Toaster } from "react-hot-toast"

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { id: string; name: string; email: string; role: string }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [unread, setUnread] = useState(0)
  const [openNotif, setOpenNotif] = useState(false)
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; read: boolean }[]>([])

  // SSE (optional): connect if backend exists; ignore errors otherwise.
  useEffect(() => {
    let es: EventSource | null = null
    try {
      es = new EventSource("/api/events")
      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'notification.created') {
            setNotifications((prev) => [{ id: msg.id || crypto.randomUUID(), title: msg.title, body: msg.body, read: false }, ...prev])
          }
          // For book status changes, we don't handle here; dashboard panels invalidate queries locally.
        } catch {}
      }
      es.onerror = () => {
        es?.close()
      }
    } catch {
      // no-op
    }
    return () => es?.close()
  }, [])

  useEffect(() => {
    setUnread(notifications.filter((n) => !n.read).length)
  }, [notifications])

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
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
          <Button aria-label="Toggle theme" variant="ghost" size="icon" onClick={() => toggleTheme()}>
            <Sun className="h-4 w-4 block dark:hidden" /><Moon className="h-4 w-4 hidden dark:block" />
          </Button>

          <div className="relative">
            <Button aria-label="Notifications" variant="ghost" size="icon" onClick={() => setOpenNotif((v) => !v)}>
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span aria-label={`${unread} unread`} className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white px-1">
                  {unread}
                </span>
              )}
            </Button>
            {openNotif && (
              <div role="menu" aria-label="Notifications" className="absolute right-0 mt-2 w-80 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg z-50">
                <div className="flex items-center justify-between p-2">
                  <div className="text-sm font-medium">Notifications</div>
                  <button className="text-xs underline" onClick={markAllRead}>Mark all read</button>
                </div>
                <div className="max-h-80 overflow-auto divide-y divide-neutral-200 dark:divide-neutral-800">
                  {notifications.length === 0 ? (
                    <div className="p-3 text-sm text-neutral-500">No notifications</div>
                  ) : notifications.map((n) => (
                    <div key={n.id} className={cn("p-3 text-sm", !n.read && "bg-blue-50/50 dark:bg-blue-950/20")}>{n.title}<div className="text-xs text-neutral-500">{n.body}</div></div>
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
