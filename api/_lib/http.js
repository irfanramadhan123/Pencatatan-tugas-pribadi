export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function readJsonBody(request) {
  if (request.body !== undefined) {
    if (!request.body) {
      return {}
    }

    if (typeof request.body === 'string') {
      try {
        return JSON.parse(request.body)
      } catch {
        throw new Error('Body JSON tidak valid.')
      }
    }

    return request.body
  }

  return new Promise((resolve, reject) => {
    let body = ''

    request.on('data', (chunk) => {
      body += chunk
    })

    request.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('Body JSON tidak valid.'))
      }
    })

    request.on('error', reject)
  })
}

export function sendJson(response, statusCode, payload) {
  if (typeof response.status === 'function') {
    response.status(statusCode).json(payload)
    return
  }

  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...corsHeaders,
  })
  response.end(JSON.stringify(payload))
}

export function sendMethodNotAllowed(response, methods) {
  if (typeof response.setHeader === 'function') {
    response.setHeader('Allow', methods.join(', '))
  }

  sendJson(response, 405, { message: 'Method tidak diizinkan.' })
}
