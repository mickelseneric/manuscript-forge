import { cookies } from 'next/headers'
import { verifyToken, cookieName } from './auth'
import prisma from './prisma'

export type RequireUserResult =
  | { ok: true; user: { id: string; email: string; name: string; role: string } }
  | { ok: false; status: 401 }

export async function requireUser(): Promise<RequireUserResult> {
  const cookieStore = await cookies()
  const token = cookieStore.get(cookieName)?.value
  if (!token) return { ok: false, status: 401 }
  try {
    const payload = await verifyToken(token)
    const userId = payload.sub
    if (!userId) return { ok: false, status: 401 }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) return { ok: false, status: 401 }
    return { ok: true, user: { ...user, role: String(user.role) } }
  } catch {
    return { ok: false, status: 401 }
  }
}

export function assertRole(user: { role: string }, roles: string[] | string): { ok: true } | { ok: false; status: 403 } {
  const allowed = Array.isArray(roles) ? roles : [roles]
  if (allowed.includes(user.role)) return { ok: true }
  return { ok: false, status: 403 }
}
