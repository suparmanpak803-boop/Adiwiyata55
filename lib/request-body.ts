// B-03: baca body JSON dengan batas byte yang sebenarnya. Pemeriksaan
// header `content-length` saja tidak cukup: pada `Transfer-Encoding:
// chunked` header itu tidak ada, sehingga body sebesar apa pun lolos.
// `request.text()` membaca seluruh body apa pun encoding transfernya,
// lalu panjang byte dihitung dari teks yang benar-benar diterima.
export type ReadJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'too_large' | 'invalid_json' }

export async function readJsonBody<T>(request: Request, maxBytes = 60_000): Promise<ReadJsonResult<T>> {
  const text = await request.text()
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, reason: 'too_large' }
  try { return { ok: true, data: JSON.parse(text) as T } } catch { return { ok: false, reason: 'invalid_json' } }
}
