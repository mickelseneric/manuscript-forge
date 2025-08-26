import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'
import { performTransition } from '@/lib/bookTransitions'
import { z } from 'zod'

const BodySchema = z.object({
  action: z.enum(['submit','ready','publish','changes-required','not-ready'])
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const id = params.id
  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  try {
    const result = await prisma.$transaction(async (tx) => {
      return await performTransition({ tx, bookId: id, actor: user, action: parsed.data.action })
    })
    return NextResponse.json(result)
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 409
    const message = e?.message || 'Conflict'
    return NextResponse.json({ error: message }, { status })
  }
}
