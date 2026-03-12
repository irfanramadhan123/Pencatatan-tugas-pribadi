import { readJsonBody } from './http.js'
import { createSessionToken, getBearerToken, verifySessionToken } from './session.js'

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeFullName(value, email) {
  const fullName = String(value ?? '').trim()

  if (fullName) {
    return fullName
  }

  return email.split('@')[0] || 'Pengguna Baru'
}

export function normalizeUser(row) {
  return {
    id: Number(row.id),
    email: row.email,
    googleSub: row.google_sub ?? '',
    fullName: row.full_name,
    avatar: row.profile_image ?? '',
    initials: row.full_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
    memberSince: row.created_at,
  }
}

export function createAuthResponse(user) {
  return {
    user,
    sessionToken: createSessionToken(user),
  }
}

export async function upsertUserByEmail(sql, request) {
  const body = await readJsonBody(request)
  const email = normalizeEmail(body.email)

  if (!email || !email.includes('@')) {
    throw new TypeError('Email tidak valid.')
  }

  const fullName = normalizeFullName(body.fullName, email)

  const [user] = await sql`
    INSERT INTO users (email, full_name)
    VALUES (${email}, ${fullName})
    ON CONFLICT (email)
    DO UPDATE SET
      full_name = CASE
        WHEN ${String(body.fullName ?? '').trim()} <> '' THEN EXCLUDED.full_name
        ELSE users.full_name
      END
    RETURNING id, email, google_sub, full_name, profile_image, created_at
  `

  return normalizeUser(user)
}

export async function findUserByEmail(sql, emailValue) {
  const email = normalizeEmail(emailValue)

  if (!email) {
    return null
  }

  const [user] = await sql`
    SELECT id, email, google_sub, full_name, profile_image, created_at
    FROM users
    WHERE email = ${email}
  `

  return user ? normalizeUser(user) : null
}

export async function upsertUserFromGoogle(sql, payload) {
  const email = normalizeEmail(payload.email)
  const googleSub = String(payload.sub ?? '').trim()
  const fullName = normalizeFullName(payload.name, email)
  const profileImage = String(payload.picture ?? '').trim()

  if (!email || !email.includes('@')) {
    throw new TypeError('Email Google tidak valid.')
  }

  if (!googleSub) {
    throw new TypeError('Token Google tidak memiliki subject yang valid.')
  }

  const [user] = await sql`
    INSERT INTO users (email, google_sub, full_name, profile_image)
    VALUES (${email}, ${googleSub}, ${fullName}, ${profileImage})
    ON CONFLICT (email)
    DO UPDATE SET
      google_sub = EXCLUDED.google_sub,
      full_name = EXCLUDED.full_name,
      profile_image = EXCLUDED.profile_image
    RETURNING id, email, google_sub, full_name, profile_image, created_at
  `

  return normalizeUser(user)
}

export async function requireAuthUser(sql, request) {
  const token = getBearerToken(request)
  const session = verifySessionToken(token)
  const email = session.email
  const user = await findUserByEmail(sql, email)

  if (!user) {
    throw new Error('Sesi login tidak ditemukan.')
  }

  return user
}
