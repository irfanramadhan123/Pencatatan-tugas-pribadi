import { createAuthResponse, upsertUserFromGoogle } from '../_lib/auth.js'
import { ensureDatabaseSchema, getSql } from '../_lib/db.js'
import { verifyGoogleCredential } from '../_lib/google.js'
import { readJsonBody, sendJson, sendMethodNotAllowed } from '../_lib/http.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendMethodNotAllowed(response, ['POST'])
    return
  }

  const sql = getSql()

  try {
    await ensureDatabaseSchema(sql)
    const body = await readJsonBody(request)
    const payload = await verifyGoogleCredential(body.credential)
    const user = await upsertUserFromGoogle(sql, payload)
    sendJson(response, 200, createAuthResponse(user))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi error server.'
    const statusCode = [
      'Credential Google wajib dikirim.',
      'Email Google tidak valid.',
      'Token Google tidak memiliki subject yang valid.',
      'Akun Google belum memiliki email terverifikasi.',
      'GOOGLE_CLIENT_ID belum di-set.',
      'SESSION_SECRET belum di-set.',
    ].includes(message)
      ? 400
      : 500

    sendJson(response, statusCode, { message })
  }
}
