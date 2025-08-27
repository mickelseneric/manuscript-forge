"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import toast, { Toaster } from 'react-hot-toast'

import { fetchJSON } from '@/lib/fetch'

export function ReviewsClient({ bookId }: { bookId: string }) {
  const qc = useQueryClient()
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => fetchJSON<{ id: string; email: string; name: string; role: string }>(`/api/auth/me`),
    retry: false,
  })
  const reviews = useQuery({
    queryKey: ['reviews', bookId],
    queryFn: () => fetchJSON<{ items: { id: string; readerId: string; readerName: string; rating: number; body: string; createdAt: string }[] }>(`/api/books/${bookId}/reviews`),
  })

  const items = reviews.data?.items || []
  const myId = me.data?.id
  const isReader = me.data?.role === 'Reader'
  const hasReviewed = useMemo(() => !!(myId && items.some(r => r.readerId === myId)), [myId, items])

  const [rating, setRating] = useState<number>(5)
  const [body, setBody] = useState<string>('')

  const submit = useMutation({
    mutationFn: (p: { rating: number; body: string }) => fetchJSON(`/api/books/${bookId}/reviews`, { method: 'POST', body: JSON.stringify(p) }),
    onMutate: async (p) => {
      if (!me.data) return
      await qc.cancelQueries({ queryKey: ['reviews', bookId] })
      const prev = qc.getQueryData<{ items: { id: string; readerId: string; readerName: string; rating: number; body: string; createdAt: string }[] }>(['reviews', bookId])
      const optimistic = {
        id: 'temp-' + Math.random().toString(36).slice(2),
        readerId: me.data.id,
        readerName: me.data.name,
        rating: p.rating,
        body: p.body,
        createdAt: new Date().toISOString(),
      }
      qc.setQueryData(['reviews', bookId], { items: [optimistic, ...(prev?.items || [])] })
      return { prev }
    },
    onError: (e: Error & { status?: number }, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(['reviews', bookId], ctx.prev)
      if (e.status === 401) {
        window.location.href = '/auth/login?next=' + encodeURIComponent(window.location.pathname)
      } else if (e.status === 403) {
        toast.error("You don't have permission to review. Use a Reader account.")
      } else if (e.status === 409) {
        toast.error('You already reviewed this book or the book is not available for review.')
      } else {
        toast.error(e.message || 'Failed to submit review')
      }
    },
    onSuccess: (_data) => {
      toast.success('Review submitted')
      setBody('')
      // Refresh to replace optimistic row with server data and hide the form
      qc.invalidateQueries({ queryKey: ['reviews', bookId] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })

  return (
    <div className="space-y-3">
      <Toaster position="top-right" />
      {reviews.isLoading ? (
        <div className="text-sm">Loading reviews…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-neutral-500">No reviews yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">
                    {r.readerName}
                    {myId && r.readerId === myId && (
                      <span className="ml-2 text-xs rounded bg-emerald-100 text-emerald-700 px-2 py-0.5">Your review</span>
                    )}
                  </div>
                  <div aria-label={`${r.rating} out of 5`} className="text-xs text-amber-600">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                </div>
                <div className="text-sm mt-1 whitespace-pre-wrap">{r.body}</div>
                <div className="text-xs text-neutral-500 mt-1">{new Date(r.createdAt).toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review form */}
      {me.isLoading ? null : !me.data ? (
        <div className="text-sm">Log in as a Reader to leave a review.</div>
      ) : !isReader ? null : hasReviewed ? null : (
        <div className="mt-4 border rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Add a review</div>
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-start">
            <div>
              <Label htmlFor="rating">Rating</Label>
              <select id="rating" className="mt-1 block w-full border rounded px-2 py-1 bg-white text-black dark:bg-neutral-900 dark:text-white" value={rating} onChange={(e) => setRating(parseInt(e.target.value, 10))}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="body">Review</Label>
              <textarea id="body" className="mt-1 block w-full h-24 border rounded px-2 py-1 bg-white text-black dark:bg-neutral-900 dark:text-white text-sm" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your thoughts…" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button disabled={!body || submit.isPending} onClick={() => submit.mutate({ rating, body })}>Submit</Button>
          </div>
        </div>
      )}
    </div>
  )
}
