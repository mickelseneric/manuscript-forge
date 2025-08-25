import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser, assertRole } from '@/lib/api-auth'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireUser()
  if (!result.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = result
  if (!assertRole(user, 'Publisher').ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id

  try {
    await prisma.$transaction(async (tx) => {
      const update = await tx.book.updateMany({
        where: {
          id,
          status: 'ready',
          OR: [{ publisherId: user.id }, { publisherId: null }],
        },
        data: { status: 'published', publisherId: user.id },
      })
      if (update.count === 0) {
        throw new Error('conflict')
      }
      await tx.bookEventOutbox.create({
        data: {
          type: 'BookPublished',
          payload: { bookId: id, actorId: user.id, from: 'ready', to: 'published' },
          occurredAt: new Date(),
        },
      })
    })
  } catch (e) {
    return NextResponse.json({ error: 'Conflict' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
