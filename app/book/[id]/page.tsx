import { headers } from "next/headers"
import { notFound } from "next/navigation"

async function getBook(baseUrl: string, id: string) {
  const res = await fetch(`${baseUrl}/api/books/${id}`, { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export default async function BookDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Build absolute base URL from request headers
  const h = await headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const baseUrl = `${proto}://${host}`

  const book = await getBook(baseUrl, id)
  if (!book) return notFound()

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <a href="/dashboard" className="text-sm underline">← Back</a>
      <h1 className="text-3xl font-serif font-semibold">{book.title}</h1>
      <div className="prose dark:prose-invert max-w-none">
        <pre className="whitespace-pre-wrap text-sm bg-neutral-50 dark:bg-neutral-900 p-3 rounded-md border border-neutral-200 dark:border-neutral-800">{book.content}</pre>
      </div>

      <div className="mt-6">
        <div className="text-xl font-semibold mb-2">Reviews</div>
        <div className="text-sm text-neutral-500">Reviews UI coming soon. Submitting reviews is not yet implemented on the API.</div>
      </div>
    </div>
  )
}
