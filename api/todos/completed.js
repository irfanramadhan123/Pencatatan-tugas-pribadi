import { requireAuthUser } from '../_lib/auth.js'
import { ensureDatabaseSchema, getSql } from '../_lib/db.js'
import { sendJson, sendMethodNotAllowed } from '../_lib/http.js'
import { clearCompletedTodos } from '../_lib/todos.js'

export default async function handler(request, response) {
  if (request.method !== 'DELETE') {
    sendMethodNotAllowed(response, ['DELETE'])
    return
  }

  const sql = getSql()

  try {
    await ensureDatabaseSchema(sql)
    const user = await requireAuthUser(sql, request)
    await clearCompletedTodos(sql, user.id)
    sendJson(response, 200, { message: 'Semua tugas selesai telah dihapus.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi error server.'
    const statusCode =
      message === 'Sesi login tidak ditemukan.' ||
      message === 'Session token tidak valid.' ||
      message === 'Session token sudah tidak berlaku.' ||
      message === 'SESSION_SECRET belum di-set.'
        ? 401
        : 500

    sendJson(response, statusCode, { message })
  }
}
