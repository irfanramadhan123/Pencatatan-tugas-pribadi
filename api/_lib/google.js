import { OAuth2Client } from 'google-auth-library'

let googleClient

function getGoogleClientId() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID?.trim() ??
    process.env.VITE_GOOGLE_CLIENT_ID?.trim() ??
    ''

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID belum di-set.')
  }

  return clientId
}

function getGoogleClient() {
  if (!googleClient) {
    googleClient = new OAuth2Client(getGoogleClientId())
  }

  return googleClient
}

export async function verifyGoogleCredential(credential) {
  const token = String(credential ?? '').trim()

  if (!token) {
    throw new TypeError('Credential Google wajib dikirim.')
  }

  const clientId = getGoogleClientId()
  const ticket = await getGoogleClient().verifyIdToken({
    idToken: token,
    audience: clientId,
  })
  const payload = ticket.getPayload()

  if (!payload?.email || !payload.email_verified) {
    throw new Error('Akun Google belum memiliki email terverifikasi.')
  }

  return payload
}
