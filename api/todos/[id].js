import { ensureTodosTable, getSql } from '../_lib/db.js'
import { sendJson, sendMethodNotAllowed } from '../_lib/http.js'
import { deleteTodo, updateTodoStatus } from '../_lib/todos.js'

function parseTodoId(request) {
  const rawId =
    request.query?.id ??
    new URL(request.url ?? '/', 'http://localhost').pathname.match(/\/api\/todos\/(\d+)$/)?.[1]

  const todoId = Number(rawId)
  return Number.isInteger(todoId) && todoId > 0 ? todoId : null
}

export default async function handler(request, response) {
  const todoId = parseTodoId(request)

  if (!todoId) {
    sendJson(response, 400, { message: 'ID tugas tidak valid.' })
    return
  }

  const sql = getSql()

  try {
    await ensureTodosTable(sql)

    if (request.method === 'PATCH') {
      const todo = await updateTodoStatus(sql, request, todoId)

      if (!todo) {
        sendJson(response, 404, { message: 'Tugas tidak ditemukan.' })
        return
      }

      sendJson(response, 200, todo)
      return
    }

    if (request.method === 'DELETE') {
      const deleted = await deleteTodo(sql, todoId)

      if (!deleted) {
        sendJson(response, 404, { message: 'Tugas tidak ditemukan.' })
        return
      }

      sendJson(response, 200, { message: 'Tugas dihapus.' })
      return
    }

    sendMethodNotAllowed(response, ['PATCH', 'DELETE'])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi error server.'
    const statusCode =
      message === 'Field done harus boolean.'
        ? 400
        : 500

    sendJson(response, statusCode, { message })
  }
}
