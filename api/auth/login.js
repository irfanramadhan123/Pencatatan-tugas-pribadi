import { ensureDatabaseSchema, getSql } from '../_lib/db.js'
import { sendJson, sendMethodNotAllowed } from '../_lib/http.js'
import { createAuthResponse, upsertUserByEmail } from '../_lib/auth.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendMethodNotAllowed(response, ['POST'])
    return
  }

  const sql = getSql()

  try {
    await ensureDatabaseSchema(sql)
    const user = await upsertUserByEmail(sql, request)
    sendJson(response, 200, createAuthResponse(user))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi error server.'
    const statusCode =
      message === 'Email tidak valid.' || message === 'SESSION_SECRET belum di-set.'
        ? 400
        : 500

    sendJson(response, statusCode, { message })
  }
}
