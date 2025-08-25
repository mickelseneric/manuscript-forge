import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { cookieName, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(cookieName)?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const payload = await verifyToken(token)
    const userId = payload.sub
    if (!userId) throw new Error('No sub')
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
