import { NextRequest, NextResponse } from 'next/server'
import { getCookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next') || '/auth/login'
  const res = NextResponse.redirect(new URL(next, req.url))
  const opts = getCookieOptions()
  res.cookies.set({ ...opts, value: '', maxAge: 0 })
  return res
}
