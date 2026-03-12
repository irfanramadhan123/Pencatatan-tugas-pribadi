import { requireAuthUser } from '../_lib/auth.js'
import { ensureDatabaseSchema, getSql } from '../_lib/db.js'
import { sendJson, sendMethodNotAllowed } from '../_lib/http.js'
import { createTodo, listTodos } from '../_lib/todos.js'

export default async function handler(request, response) {
  const sql = getSql()

  try {
    await ensureDatabaseSchema(sql)
    const user = await requireAuthUser(sql, request)

    if (request.method === 'GET') {
      sendJson(response, 200, await listTodos(sql, user.id))
      return
    }

    if (request.method === 'POST') {
      sendJson(response, 201, await createTodo(sql, request, user.id))
      return
    }

    sendMethodNotAllowed(response, ['GET', 'POST'])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi error server.'
    const statusCode =
      message === 'Tugas tidak boleh kosong.' ||
      message === 'Sesi login tidak ditemukan.' ||
      message === 'Session token tidak valid.' ||
      message === 'Session token sudah tidak berlaku.' ||
      message === 'SESSION_SECRET belum di-set.'
        ? 400
        : 500

    sendJson(response, statusCode, { message })
  }
}
