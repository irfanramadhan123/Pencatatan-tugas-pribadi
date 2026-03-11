import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import healthHandler from './api/health.js'
import todoByIdHandler from './api/todos/[id].js'
import clearCompletedHandler from './api/todos/completed.js'
import todosHandler from './api/todos/index.js'

loadEnvFile()

const port = Number(process.env.PORT ?? 3001)

function loadEnvFile() {
  const envPath = path.resolve('.env')

  if (!fs.existsSync(envPath)) {
    return
  }

  const content = fs.readFileSync(envPath, 'utf8')

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim()

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmedLine.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmedLine.slice(0, separatorIndex).trim()
    const value = trimmedLine.slice(separatorIndex + 1).trim()

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)
  const { pathname } = url

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    response.end()
    return
  }

  try {
    if (request.method === 'GET' && pathname === '/api/health') {
      await healthHandler(request, response)
      return
    }

    if (pathname === '/api/todos') {
      await todosHandler(request, response)
      return
    }

    if (pathname === '/api/todos/completed') {
      await clearCompletedHandler(request, response)
      return
    }

    if (/^\/api\/todos\/\d+$/.test(pathname)) {
      await todoByIdHandler(request, response)
      return
    }

    response.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    response.end(JSON.stringify({ message: 'Endpoint tidak ditemukan.' }))
  } catch (error) {
    response.writeHead(500, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    response.end(
      JSON.stringify({
        message: error instanceof Error ? error.message : 'Terjadi error server.',
      }),
    )
  }
})

server.listen(port, () => {
  console.log(`API todo aktif di http://localhost:${port}`)
})
