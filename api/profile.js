import { requireAuthUser } from './_lib/auth.js'
import { ensureDatabaseSchema, getSql } from './_lib/db.js'
import { sendJson, sendMethodNotAllowed } from './_lib/http.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    sendMethodNotAllowed(response, ['GET'])
    return
  }

  const sql = getSql()

  try {
    await ensureDatabaseSchema(sql)
    const user = await requireAuthUser(sql, request)
    sendJson(response, 200, user)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi error server.'
    const statusCode = [
      'Sesi login tidak ditemukan.',
      'Session token tidak valid.',
      'Session token sudah tidak berlaku.',
      'SESSION_SECRET belum di-set.',
    ].includes(message)
      ? 401
      : 500

    sendJson(response, statusCode, { message })
  }
}
