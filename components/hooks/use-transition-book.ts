"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import type { Action } from "@/lib/bookState"

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
    credentials: 'include',
  })
  if (!r.ok) {
    const data: unknown = await r.json().catch(() => ({}))
    const message = (data as { error?: string })?.error || r.statusText
    const err = new Error(message) as Error & { status?: number }
    err.status = r.status
    throw err
  }
  return r.json()
}

export type TransitionParams = {
  id: string
  action: Action
  from: 'draft'|'editing'|'ready'|'published'
  to: 'draft'|'editing'|'ready'|'published'
}

type BookListItem = { id: string } & Record<string, unknown>

export function useTransitionBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: TransitionParams) =>
      fetchJSON(`/api/books/${p.id}/transition`, { method: 'POST', body: JSON.stringify({ action: p.action }) }),
    onMutate: async (p) => {
      // Optimistic remove from the source list
      await qc.cancelQueries({ queryKey: ['books', p.from] })
      const prev = (qc.getQueryData(['books', p.from]) as BookListItem[]) || []
      qc.setQueryData<BookListItem[]>(['books', p.from], prev.filter((b) => b.id !== p.id))
      return { prev, from: p.from, to: p.to }
    },
    onError: (e: (Error & { status?: number }) | unknown, _vars, ctx) => {
      // Roll back
      if (ctx?.prev && ctx.from) qc.setQueryData(['books', ctx.from], ctx.prev)
      const status = (e as { status?: number })?.status
      if (status === 401) {
        window.location.href = "/auth/login?next=" + encodeURIComponent(window.location.pathname + window.location.search)
      } else if (status === 403) {
        toast.error("You don’t have permission to perform this action.")
      } else if (status === 409) {
        toast.error("Book is no longer in the required state.")
        // Refetch affected list to reconcile
        if (ctx?.from) qc.invalidateQueries({ queryKey: ['books', ctx.from] })
        if (ctx?.to) qc.invalidateQueries({ queryKey: ['books', ctx.to] })
      } else {
        const msg = (e as Error)?.message || 'Failed'
        toast.error(msg)
      }
    },
    onSuccess: (_data, _vars, ctx) => {
      // Success UX and invalidations
      toast.success('Status updated')
      if (ctx?.from) qc.invalidateQueries({ queryKey: ['books', ctx.from] })
      if (ctx?.to) qc.invalidateQueries({ queryKey: ['books', ctx.to] })
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['notifications','unread-count'] })
      qc.invalidateQueries({ queryKey: ['notifications','list'] })
    },
  })
}
