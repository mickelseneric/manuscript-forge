import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser, assertRole } from '@/lib/api-auth'
import { publishToRole } from '@/lib/sse'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireUser()
  if (!result.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = result
  if (!assertRole(user, 'Author').ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id

  try {
    await prisma.$transaction(async (tx) => {
      const update = await tx.book.updateMany({
        where: { id, authorId: user.id, status: 'draft' },
        data: { status: 'editing', editorId: null, publisherId: null },
      })
      if (update.count === 0) {
        throw new Error('conflict')
      }
      const eventId = crypto.randomUUID()
      await tx.bookEventOutbox.create({
        data: {
          type: 'BookSubmitted',
          payload: { eventId, bookId: id, actorId: user.id, from: 'draft', to: 'editing', occurredAt: new Date().toISOString() },
          occurredAt: new Date(),
        },
      })
    })
  } catch (e) {
    return NextResponse.json({ error: 'Conflict' }, { status: 409 })
  }

  // Notify Editors that a book moved to editing
  publishToRole('Editor', 'books.statusChanged', { bookId: id, from: 'draft', to: 'editing' })
  return NextResponse.json({ ok: true })
}
