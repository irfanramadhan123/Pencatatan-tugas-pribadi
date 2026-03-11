import { sendJson } from './_lib/http.js'

export default async function handler(_request, response) {
  sendJson(response, 200, { ok: true })
}
