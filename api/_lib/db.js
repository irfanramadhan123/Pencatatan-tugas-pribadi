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

export function ensureDatabaseSchema(sql = getSql()) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          google_sub TEXT UNIQUE,
          full_name TEXT NOT NULL DEFAULT 'Pengguna Baru',
          profile_image TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `

      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS google_sub TEXT UNIQUE
      `

      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_image TEXT NOT NULL DEFAULT ''
      `

      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_key
        ON users (google_sub)
        WHERE google_sub IS NOT NULL
      `

      await sql`
        CREATE TABLE IF NOT EXISTS todos (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          done BOOLEAN NOT NULL DEFAULT FALSE,
          category TEXT NOT NULL DEFAULT 'Umum',
          deadline DATE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `

      await sql`
        ALTER TABLE todos
        ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE
      `
    })()
  }

  return schemaReadyPromise
}
