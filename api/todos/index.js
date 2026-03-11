import { ensureTodosTable, getSql } from '../_lib/db.js'
import { sendJson, sendMethodNotAllowed } from '../_lib/http.js'
import { createTodo, listTodos } from '../_lib/todos.js'

export default async function handler(request, response) {
  const sql = getSql()

  try {
    await ensureTodosTable(sql)

    if (request.method === 'GET') {
      sendJson(response, 200, await listTodos(sql))
      return
    }

    if (request.method === 'POST') {
      sendJson(response, 201, await createTodo(sql, request))
      return
    }

    sendMethodNotAllowed(response, ['GET', 'POST'])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi error server.'
    const statusCode =
      message === 'Tugas tidak boleh kosong.'
        ? 400
        : 500

    sendJson(response, statusCode, { message })
  }
}
