// B-03: baca body JSON dengan batas byte yang sebenarnya. Pemeriksaan
// header `content-length` saja tidak cukup: pada `Transfer-Encoding:
// chunked` header itu tidak ada, sehingga body sebesar apa pun lolos.
// Body dibaca lewat stream dan dibatalkan begitu melewati batas —
// membaca seluruh body dulu (request.text()) lalu memeriksa panjangnya
// tetap membiarkan body raksasa memenuhi memori sebelum ditolak.
export type ReadJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'too_large' | 'invalid_json' }

export async function readJsonBody<T>(request: Request, maxBytes = 60_000): Promise<ReadJsonResult<T>> {
  const stream = request.body
  if (!stream) return { ok: false, reason: 'invalid_json' }
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined)
        return { ok: false, reason: 'too_large' }
      }
      chunks.push(value)
    }
  } catch {
    return { ok: false, reason: 'invalid_json' }
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  try { return { ok: true, data: JSON.parse(new TextDecoder().decode(merged)) as T } } catch { return { ok: false, reason: 'invalid_json' } }
}
