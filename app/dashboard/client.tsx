"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"

function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  return fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } }).then(async (r) => {
    if (!r.ok) {
      const data = await r.json().catch(() => ({}))
      const err: any = new Error(data?.error || r.statusText)
      err.status = r.status
      throw err
    }
    return r.json()
  })
}

function useBooks(status?: string) {
  return useQuery({
    queryKey: ["books", status || "all"],
    queryFn: () => fetchJSON<any[]>(`/api/books${status ? `?status=${status}` : ''}`),
  })
}

export function AuthorPanel() {
  const qc = useQueryClient()
  const drafts = useBooks('draft')
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  const createDraft = useMutation({
    mutationFn: (data: { title: string; content: string }) => fetchJSON<any>("/api/books", { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (book) => {
      toast.success("Draft created")
      setOpen(false); setTitle(""); setContent("")
      qc.setQueryData<any[]>(["books", "draft"], (prev) => prev ? [book, ...prev] : [book])
    },
    onError: (e: any) => {
      if (e.status === 401) window.location.href = "/auth/login?next=/dashboard"
      else toast.error(e.message || "Failed to create draft")
    }
  })

  const submitDraft = useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/books/${id}/submit`, { method: 'POST' }),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["books", "draft"] })
      const prev = qc.getQueryData<any[]>(["books", "draft"]) || []
      qc.setQueryData<any[]>(["books", "draft"], prev.filter((b) => b.id !== id))
      return { prev }
    },
    onError: (e: any, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["books", "draft"], ctx.prev)
      if (e.status === 409) toast.error("Cannot submit: already submitted or not your draft")
      else if (e.status === 401) window.location.href = "/auth/login?next=/dashboard"
      else if (e.status === 403) toast.error("Forbidden")
      else toast.error("Failed to submit")
    },
    onSuccess: () => {
      toast.success("Submitted for editing")
      qc.invalidateQueries({ queryKey: ["books", "editing"] })
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Drafts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-neutral-600 dark:text-neutral-300">Create and manage your drafts.</div>
          <Button onClick={() => setOpen(true)}>New Draft</Button>
        </div>

        {drafts.isLoading ? (
          <div className="text-sm">Loading…</div>
        ) : drafts.data && drafts.data.length > 0 ? (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {drafts.data.map((b) => (
              <li key={b.id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{b.title}</div>
                  <div className="text-xs text-neutral-500">Updated {new Date(b.updatedAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => window.location.href = `/dashboard?tab=edit-${b.id}`}>Edit</Button>
                  <Button onClick={() => submitDraft.mutate(b.id)}>Submit</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-neutral-500">No drafts.</div>
        )}

        {open && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-md rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
              <div className="text-lg font-semibold mb-3">New Draft</div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Draft title" />
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-32 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 text-sm" placeholder="Write something…" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={() => createDraft.mutate({ title, content })} disabled={!title || !content || createDraft.isPending}>Create</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function EditorPanel() {
  const qc = useQueryClient()
  const editing = useBooks('editing')
  const markReady = useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/books/${id}/ready`, { method: 'POST' }),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["books", "editing"] })
      const prev = qc.getQueryData<any[]>(["books", "editing"]) || []
      qc.setQueryData<any[]>(["books", "editing"], prev.filter((b) => b.id !== id))
      return { prev }
    },
    onError: (e: any, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["books", "editing"], ctx.prev)
      if (e.status === 409) toast.error("Conflict: cannot mark ready")
      else if (e.status === 401) window.location.href = "/auth/login?next=/dashboard"
      else if (e.status === 403) toast.error("Forbidden")
      else toast.error("Failed")
    },
    onSuccess: () => {
      toast.success("Marked ready")
      qc.invalidateQueries({ queryKey: ["books", "ready"] })
    }
  })

  return (
    <Card>
      <CardHeader><CardTitle>Submitted Queue</CardTitle></CardHeader>
      <CardContent>
        {editing.isLoading ? 'Loading…' : (editing.data?.length ? (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {editing.data.map((b) => (
              <li key={b.id} className="py-3 flex items-center justify-between">
                <div className="font-medium">{b.title}</div>
                <Button onClick={() => markReady.mutate(b.id)}>Mark Ready</Button>
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-neutral-500">No submissions.</div>)}
      </CardContent>
    </Card>
  )
}

export function PublisherPanel() {
  const qc = useQueryClient()
  const ready = useBooks('ready')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const publish = useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/books/${id}/publish`, { method: 'POST' }),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["books", "ready"] })
      const prev = qc.getQueryData<any[]>(["books", "ready"]) || []
      qc.setQueryData<any[]>(["books", "ready"], prev.filter((b) => b.id !== id))
      return { prev }
    },
    onError: (e: any, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["books", "ready"], ctx.prev)
      if (e.status === 409) toast.error("Conflict: cannot publish")
      else if (e.status === 401) window.location.href = "/auth/login?next=/dashboard"
      else if (e.status === 403) toast.error("Forbidden")
      else toast.error("Failed")
    },
    onSuccess: () => {
      toast.success("Published")
      qc.invalidateQueries({ queryKey: ["books", "published"] })
    }
  })

  return (
    <Card>
      <CardHeader><CardTitle>Ready Queue</CardTitle></CardHeader>
      <CardContent>
        {ready.isLoading ? 'Loading…' : (ready.data?.length ? (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {ready.data.map((b) => (
              <li key={b.id} className="py-3 flex items-center justify-between">
                <div className="font-medium">{b.title}</div>
                <Button onClick={() => setConfirmId(b.id)}>Publish</Button>
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-neutral-500">No items.</div>)}

        {confirmId && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmId(null)} />
            <div className="relative w-full max-w-sm rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
              <div className="font-semibold mb-2">Publish this book?</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">Once published, it will appear to readers.</div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancel</Button>
                <Button onClick={() => { const id = confirmId; setConfirmId(null); if (id) publish.mutate(id) }}>Confirm</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ReaderPanel() {
  const published = useBooks('published')
  return (
    <Card>
      <CardHeader><CardTitle>Published Books</CardTitle></CardHeader>
      <CardContent>
        {published.isLoading ? 'Loading…' : (published.data?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {published.data.map((b) => (
              <a key={b.id} href={`/book/${b.id}`} className="block rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 hover:shadow">
                <div className="font-medium font-serif text-lg">{b.title}</div>
                <div className="text-xs text-neutral-500">Published {new Date(b.updatedAt).toLocaleDateString()}</div>
              </a>
            ))}
          </div>
        ) : <div className="text-sm text-neutral-500">No published books.</div>)}
      </CardContent>
    </Card>
  )
}

export default function DashboardClient({ user }: { user: { id: string; role: string; name: string; email: string } }) {
  return (
    <div className="space-y-6">
      {user.role === 'Author' && <AuthorPanel />}
      {user.role === 'Editor' && <EditorPanel />}
      {user.role === 'Publisher' && <PublisherPanel />}
      {user.role === 'Reader' && <ReaderPanel />}
    </div>
  )
}
