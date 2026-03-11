import { neon } from '@neondatabase/serverless'

let schemaReadyPromise

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL?.trim()

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL belum di-set. Tambahkan ke environment atau file .env.',
    )
  }

  return neon(databaseUrl)
}

export function ensureTodosTable(sql = getSql()) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = sql`
      CREATE TABLE IF NOT EXISTS todos (
        id BIGSERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        done BOOLEAN NOT NULL DEFAULT FALSE,
        category TEXT NOT NULL DEFAULT 'Umum',
        deadline DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
  }

  return schemaReadyPromise
}
