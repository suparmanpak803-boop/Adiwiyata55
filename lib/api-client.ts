// Klien HTTP bersama untuk client (SWR) dan server (Apps Script).
// Kontrak yang dipakai call-site:
// - fetchJson melempar Error bila status HTTP tidak OK; body 200 dengan
//   { success: false } dikembalikan apa adanya (caller yang memeriksa).
// - readJsonResponse mem-parse JSON dari Response yang sudah di-fetch,
//   dipakai di client maupun server, jadi harus murni response.json().

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    for (const key of ['error', 'pesan', 'message']) {
      if (typeof record[key] === 'string' && (record[key] as string).trim()) {
        return record[key] as string
      }
    }
  }
  return fallback
}

export async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(extractErrorMessage(body, `Permintaan gagal (${response.status}).`))
  }
  return body as T
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}
