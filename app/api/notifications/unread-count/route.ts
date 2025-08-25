import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'

export async function GET(_req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const count = await prisma.notification.count({ where: { userId: user.id, readAt: null } })
  return NextResponse.json({ count })
}
