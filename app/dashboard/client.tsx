"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"
import { useTransitionBook } from "@/components/hooks/use-transition-book"

import { fetchJSON } from '@/lib/fetch'

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

  // Edit modal state
  const [editing, setEditing] = useState<{ id: string; title: string; content: string } | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)

  function openEdit(id: string) {
    setLoadingEdit(true)
    fetchJSON<any>(`/api/books/${id}`)
      .then((b) => {
        setEditing({ id: b.id, title: b.title, content: b.content })
      })
      .catch((e: any) => {
        if (e.status === 401) window.location.href = "/auth/login?next=/dashboard"
        else if (e.status === 404) toast.error("Draft not found")
        else toast.error("Failed to load draft")
      })
      .finally(() => setLoadingEdit(false))
  }

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

  const transition = useTransitionBook()

  const deleteDraft = useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/books/${id}`, { method: 'DELETE' }),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["books", "draft"] })
      const prev = qc.getQueryData<any[]>(["books", "draft"]) || []
      qc.setQueryData<any[]>(["books", "draft"], prev.filter((b) => b.id !== id))
      return { prev }
    },
    onError: (e: any, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["books", "draft"], ctx.prev)
      if (e.status === 409) toast.error("Cannot delete: only your own drafts can be deleted")
      else if (e.status === 401) window.location.href = "/auth/login?next=/dashboard"
      else if (e.status === 403) toast.error("Forbidden")
      else toast.error("Failed to delete")
    },
    onSuccess: () => {
      toast.success("Draft deleted")
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
                  <Button variant="secondary" onClick={() => openEdit(b.id)}>Edit</Button>
                  <Button variant="secondary" onClick={() => { if (confirm('Delete this draft? This cannot be undone.')) deleteDraft.mutate(b.id) }}>Delete</Button>
                  <Button onClick={() => transition.mutate({ id: b.id, action: 'submit', from: 'draft', to: 'editing' })}>Submit</Button>
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

        {/* Edit Draft Modal */}
        {(editing || loadingEdit) && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => !loadingEdit && setEditing(null)} />
            <div className="relative w-full max-w-md rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
              <div className="text-lg font-semibold mb-3">Edit Draft</div>
              {loadingEdit ? (
                <div className="text-sm text-neutral-600 dark:text-neutral-300">Loading…</div>
              ) : editing ? (
                <EditForm editing={editing} onClose={() => setEditing(null)} />
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EditForm({ editing, onClose }: { editing: { id: string; title: string; content: string }; onClose: () => void }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState(editing.title)
  const [content, setContent] = useState(editing.content)

  const updateDraft = useMutation({
    mutationFn: (p: { id: string; title: string; content: string }) =>
      fetchJSON(`/api/books/${p.id}`, { method: 'PUT', body: JSON.stringify({ title: p.title, content: p.content }) }),
    onSuccess: (book: any) => {
      toast.success('Draft updated')
      qc.setQueryData<any[]>(['books', 'draft'], (prev) => (prev ? prev.map((b) => (b.id === book.id ? { ...b, title: book.title, updatedAt: book.updatedAt } : b)) : prev))
      onClose()
    },
    onError: (e: any) => {
      if (e.status === 409) toast.error('Conflict: can only edit your own draft in draft status')
      else if (e.status === 401) window.location.href = '/auth/login?next=/dashboard'
      else if (e.status === 403) toast.error('Forbidden')
      else toast.error('Failed to update')
    },
  })

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="edit-title">Title</Label>
        <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Draft title" />
      </div>
      <div>
        <Label htmlFor="edit-content">Content</Label>
        <textarea
          id="edit-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-32 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 text-sm"
          placeholder="Write something…"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={updateDraft.isPending}>Cancel</Button>
        <Button onClick={() => updateDraft.mutate({ id: editing.id, title, content })} disabled={!title || !content || updateDraft.isPending}>Save</Button>
      </div>
    </div>
  )
}

export function EditorPanel() {
  const transition = useTransitionBook()
  const qc = useQueryClient()
  const editing = useBooks('editing')

  // View modal state
  const [viewing, setViewing] = useState<{ id: string; title: string; content: string } | null>(null)
  const [loadingView, setLoadingView] = useState(false)

  function openView(id: string) {
    setLoadingView(true)
    fetchJSON<any>(`/api/books/${id}`)
      .then((b) => setViewing({ id: b.id, title: b.title, content: b.content }))
      .catch((e: any) => {
        if (e.status === 401) window.location.href = "/auth/login?next=/dashboard"
        else if (e.status === 404) toast.error("Not found")
        else toast.error("Failed to load")
      })
      .finally(() => setLoadingView(false))
  }


  return (
    <Card>
      <CardHeader><CardTitle>Submitted Queue</CardTitle></CardHeader>
      <CardContent>
        {editing.isLoading ? 'Loading…' : (editing.data?.length ? (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {editing.data.map((b) => (
              <li key={b.id} className="py-3 flex items-center justify-between">
                <button className="font-medium text-left hover:underline" onClick={() => openView(b.id)}>{b.title}</button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openView(b.id)}>Review</Button>
                  <Button onClick={() => transition.mutate({ id: b.id, action: 'ready', from: 'editing', to: 'ready' })}>Mark Ready</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-neutral-500">No submissions.</div>)}

        {(viewing || loadingView) && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => !loadingView && setViewing(null)} />
            <div className="relative w-full max-w-2xl rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
              <div className="text-lg font-semibold mb-3">{viewing ? viewing.title : 'Loading…'}</div>
              {loadingView ? (
                <div className="text-sm text-neutral-600 dark:text-neutral-300">Loading…</div>
              ) : viewing ? (
                <div className="space-y-4">
                  <pre className="whitespace-pre-wrap text-sm bg-neutral-50 dark:bg-neutral-950 p-3 rounded border border-neutral-200 dark:border-neutral-800 max-h-80 overflow-auto">{viewing.content}</pre>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>
                    <Button variant="secondary" onClick={() => viewing && transition.mutate({ id: viewing.id, action: 'changes-required', from: 'editing', to: 'draft' }, { onSuccess: () => setViewing(null) })}>Changes Required</Button>
                    <Button onClick={() => viewing && transition.mutate({ id: viewing.id, action: 'ready', from: 'editing', to: 'ready' }, { onSuccess: () => setViewing(null) })}>Submit to Publisher</Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PublisherPanel() {
  const transition = useTransitionBook()
  const qc = useQueryClient()
  const ready = useBooks('ready')

  const [viewing, setViewing] = useState<{ id: string; title: string; content: string } | null>(null)
  const [loadingView, setLoadingView] = useState(false)

  function openView(id: string) {
    setLoadingView(true)
    fetchJSON<any>(`/api/books/${id}`)
      .then((b) => setViewing({ id: b.id, title: b.title, content: b.content }))
      .catch((e: any) => {
        if (e.status === 401) window.location.href = "/auth/login?next=/dashboard"
        else if (e.status === 404) toast.error("Not found")
        else toast.error("Failed to load")
      })
      .finally(() => setLoadingView(false))
  }


  return (
    <Card>
      <CardHeader><CardTitle>Ready Queue</CardTitle></CardHeader>
      <CardContent>
        {ready.isLoading ? 'Loading…' : (ready.data?.length ? (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {ready.data.map((b) => (
              <li key={b.id} className="py-3 flex items-center justify-between">
                <button className="font-medium text-left hover:underline" onClick={() => openView(b.id)}>{b.title}</button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openView(b.id)}>Review</Button>
                  <Button onClick={() => transition.mutate({ id: b.id, action: 'publish', from: 'ready', to: 'published' })}>Publish</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-neutral-500">No items.</div>)}

        {(viewing || loadingView) && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => !loadingView && setViewing(null)} />
            <div className="relative w-full max-w-2xl rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
              <div className="text-lg font-semibold mb-3">{viewing ? viewing.title : 'Loading…'}</div>
              {loadingView ? (
                <div className="text-sm text-neutral-600 dark:text-neutral-300">Loading…</div>
              ) : viewing ? (
                <div className="space-y-4">
                  <pre className="whitespace-pre-wrap text-sm bg-neutral-50 dark:bg-neutral-950 p-3 rounded border border-neutral-200 dark:border-neutral-800 max-h-80 overflow-auto">{viewing.content}</pre>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>
                    <Button variant="secondary" onClick={() => viewing && transition.mutate({ id: viewing.id, action: 'not-ready', from: 'ready', to: 'editing' }, { onSuccess: () => setViewing(null) })}>Not Ready</Button>
                    <Button onClick={() => viewing && transition.mutate({ id: viewing.id, action: 'publish', from: 'ready', to: 'published' }, { onSuccess: () => setViewing(null) })}>Publish</Button>
                  </div>
                </div>
              ) : null}
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
