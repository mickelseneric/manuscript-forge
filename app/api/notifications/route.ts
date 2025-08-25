import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'

function parseBool(val: string | null): boolean | undefined {
  if (val === null) return undefined
  return val === 'true'
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const url = new URL(req.url)
  const unread = parseBool(url.searchParams.get('unread'))
  const limitParam = parseInt(url.searchParams.get('limit') || '20', 10)
  const limit = Math.max(1, Math.min(limitParam || 20, 50))
  const cursor = url.searchParams.get('cursor') // format: createdAt,id separated by comma or pipe

  let cursorCreatedAt: Date | undefined
  let cursorId: string | undefined
  if (cursor) {
    const parts = cursor.split(',')
    if (parts.length === 2) {
      cursorCreatedAt = new Date(parts[0])
      cursorId = parts[1]
    }
  }

  const where = {
    userId: user.id,
    ...(unread === true ? { readAt: null } : {}),
  } as const

  // We need to paginate newest first; use (createdAt desc, id desc)
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(cursorCreatedAt && cursorId
      ? { cursor: { createdAt: cursorCreatedAt, id: cursorId }, skip: 1 }
      : {}),
    take: limit,
    select: { id: true, title: true, body: true, bookId: true, createdAt: true, readAt: true },
  })

  const nextCursor = notifications.length === limit
    ? `${notifications[notifications.length - 1].createdAt.toISOString()},${notifications[notifications.length - 1].id}`
    : null

  return NextResponse.json({ items: notifications, nextCursor })
}
