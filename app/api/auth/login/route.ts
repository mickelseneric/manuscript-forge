import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookieName, getCookieOptions, signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  // Accept form-data or JSON
  let email: string | undefined
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}))
    email = body?.email
  } else {
    const form = await req.formData()
    email = (form.get('email') as string) || undefined
  }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const token = await signToken({ id: user.id, role: String(user.role) })
  const cookieOpts = getCookieOptions()

  const url = new URL(req.url)
  const next = url.searchParams.get('next') || '/dashboard'
  const res = NextResponse.redirect(new URL(next, req.url))
  res.cookies.set({ ...cookieOpts, value: token })
  return res
}
