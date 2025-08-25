import { NextRequest, NextResponse } from 'next/server'
import { cookieName, verifyToken } from './lib/auth'

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const token = req.cookies.get(cookieName)?.value
  if (!token) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('next', url.pathname + url.search)
    return NextResponse.redirect(loginUrl)
  }
  try {
    await verifyToken(token)
    return NextResponse.next()
  } catch {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('next', url.pathname + url.search)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  // Protect only page routes; exclude API, auth pages, and assets via matcher.
  matcher: ['/dashboard/:path*'],
}
