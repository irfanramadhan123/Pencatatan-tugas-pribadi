import { readJsonBody } from './http.js'

function normalizeTodo(row) {
  return {
    id: Number(row.id),
    text: row.text,
    done: row.done,
    category: row.category,
    deadline: row.deadline ?? '',
  }
}

export async function listTodos(sql, userId) {
  const rows = await sql`
    SELECT id, text, done, category, deadline
    FROM todos
    WHERE user_id = ${userId}
    ORDER BY created_at DESC, id DESC
  `

  return rows.map(normalizeTodo)
}

export async function createTodo(sql, request, userId) {
  const body = await readJsonBody(request)
  const text = String(body.text ?? '').trim()
  const category = String(body.category ?? '').trim() || 'Umum'
  const deadline = String(body.deadline ?? '').trim() || null

  if (!text) {
    throw new Error('Tugas tidak boleh kosong.')
  }

  const [todo] = await sql`
    INSERT INTO todos (user_id, text, category, deadline)
    VALUES (${userId}, ${text}, ${category}, ${deadline})
    RETURNING id, text, done, category, deadline
  `

  return normalizeTodo(todo)
}

export async function updateTodoStatus(sql, request, todoId, userId) {
  const body = await readJsonBody(request)

  if (typeof body.done !== 'boolean') {
    throw new TypeError('Field done harus boolean.')
  }

  const [todo] = await sql`
    UPDATE todos
    SET done = ${body.done}
    WHERE id = ${todoId} AND user_id = ${userId}
    RETURNING id, text, done, category, deadline
  `

  return todo ? normalizeTodo(todo) : null
}

export async function deleteTodo(sql, todoId, userId) {
  const [todo] = await sql`
    DELETE FROM todos
    WHERE id = ${todoId} AND user_id = ${userId}
    RETURNING id
  `

  return Boolean(todo)
}

export async function clearCompletedTodos(sql, userId) {
  await sql`DELETE FROM todos WHERE done = TRUE AND user_id = ${userId}`
}
