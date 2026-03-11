import { ensureTodosTable, getSql } from '../_lib/db.js'
import { sendJson, sendMethodNotAllowed } from '../_lib/http.js'
import { clearCompletedTodos } from '../_lib/todos.js'

export default async function handler(request, response) {
  if (request.method !== 'DELETE') {
    sendMethodNotAllowed(response, ['DELETE'])
    return
  }

  const sql = getSql()

  try {
    await ensureTodosTable(sql)
    await clearCompletedTodos(sql)
    sendJson(response, 200, { message: 'Semua tugas selesai telah dihapus.' })
  } catch (error) {
    sendJson(response, 500, {
      message: error instanceof Error ? error.message : 'Terjadi error server.',
    })
  }
}
