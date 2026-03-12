import crypto from 'node:crypto'

const sessionMaxAgeMs = 1000 * 60 * 60 * 24 * 7

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim()

  if (!secret) {
    throw new Error('SESSION_SECRET belum di-set.')
  }

  return secret
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signValue(value) {
  return crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url')
}

export function createSessionToken(user) {
  const payload = {
    email: user.email,
    exp: Date.now() + sessionMaxAgeMs,
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = signValue(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export function verifySessionToken(token) {
  const rawToken = String(token ?? '').trim()

  if (!rawToken.includes('.')) {
    throw new Error('Session token tidak valid.')
  }

  const [encodedPayload, signature] = rawToken.split('.')
  const expectedSignature = signValue(encodedPayload)

  if (signature.length !== expectedSignature.length) {
    throw new Error('Session token tidak valid.')
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Session token tidak valid.')
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload))

  if (!payload.email || !payload.exp || Date.now() > Number(payload.exp)) {
    throw new Error('Session token sudah tidak berlaku.')
  }

  return payload
}

export function getBearerToken(request) {
  const authorization = String(request.headers.authorization ?? '')

  if (!authorization.startsWith('Bearer ')) {
    return ''
  }

  return authorization.slice(7).trim()
}
