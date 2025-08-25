import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { makeEventStream, registerClient, unregisterClient, SSEClient } from '@/lib/sse'

export async function GET(_req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }
  const { user } = auth
  const stream = makeEventStream()

  const client: SSEClient = {
    userId: user.id,
    role: user.role,
    send: (event, data) => stream.push(event, data),
    close: () => stream.close(),
  }
  registerClient(client)

  // Send a welcome event
  stream.push('connected', { userId: user.id, role: user.role })

  // When the connection is closed by the client, unregister
  // In Next.js, when the underlying stream closes, our close() will be called by the runtime GC.
  // We also return a Response with a body that will end when the client disconnects.

  // Monkey patch the response to unregister on close is not directly available; rely on runtime.
  // Provide a finalizer after 24 hours as a guard.
  setTimeout(() => {
    unregisterClient(client)
    try { client.close() } catch {}
  }, 24 * 60 * 60 * 1000)

  return stream.response
}
