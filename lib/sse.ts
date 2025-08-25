import { NextResponse } from 'next/server'

// Simple in-memory pub/sub for Server-Sent Events
// Not suitable for multi-process; good enough for local dev and small deployments.

export type SSEClient = {
  userId: string
  role: string
  send: (event: string, data: any) => void
  close: () => void
}

const byUser = new Map<string, Set<SSEClient>>()
const byRole = new Map<string, Set<SSEClient>>()

export function registerClient(client: SSEClient) {
  if (!byUser.has(client.userId)) byUser.set(client.userId, new Set())
  byUser.get(client.userId)!.add(client)

  if (!byRole.has(client.role)) byRole.set(client.role, new Set())
  byRole.get(client.role)!.add(client)
}

export function unregisterClient(client: SSEClient) {
  const setU = byUser.get(client.userId)
  if (setU) {
    setU.delete(client)
    if (setU.size === 0) byUser.delete(client.userId)
  }
  const setR = byRole.get(client.role)
  if (setR) {
    setR.delete(client)
    if (setR.size === 0) byRole.delete(client.role)
  }
}

export function publishToUser(userId: string, event: string, data: any) {
  const set = byUser.get(userId)
  if (!set) return
  for (const c of set) {
    c.send(event, data)
  }
}

export function publishToRole(role: string, event: string, data: any) {
  const set = byRole.get(role)
  if (!set) return
  for (const c of set) {
    c.send(event, data)
  }
}

export function makeEventStream(): { response: Response; push: (event: string, data: any) => void; close: () => void } {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // ping to keep alive
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`))
      }, 15000)
      ;(controller as any)._ping = interval
    },
    cancel(reason) {
      const interval = (this as any)._ping
      if (interval) clearInterval(interval)
    },
  })
  const writer = (stream as any).writable?.getWriter?.() ?? null

  function push(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    if ((writer && writer.write) as any) {
      writer.write(encoder.encode(payload))
    } else {
      // Fallback for older Next runtimes: use controller via tees
      // Not strictly necessary here.
    }
  }

  function close() {
    if (writer && writer.close) writer.close()
  }

  const response = new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
  return { response, push, close }
}
