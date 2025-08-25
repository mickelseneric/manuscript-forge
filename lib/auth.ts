import { SignJWT, jwtVerify, JWTPayload } from 'jose'

const cookieName = 'token'
const TWO_HOURS_SECONDS = 60 * 60 * 2

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  return new TextEncoder().encode(secret)
}

export type AuthTokenPayload = JWTPayload & {
  sub: string // user id (UUID)
  role?: string
}

export async function signToken(user: { id: string; role?: string }, expiresInSeconds: number = TWO_HOURS_SECONDS) {
  const now = Math.floor(Date.now() / 1000)
  const payload: AuthTokenPayload = {
    sub: user.id,
    role: user.role,
    iat: now,
    exp: now + expiresInSeconds,
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(payload.exp!)
    .sign(getSecret())

  return token
}

export async function verifyToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify<AuthTokenPayload>(token, getSecret(), {
    algorithms: ['HS256'],
  })
  return payload
}

export function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    name: cookieName,
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
    maxAge: TWO_HOURS_SECONDS,
  }
}

export { cookieName, TWO_HOURS_SECONDS }
