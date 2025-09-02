export async function getApiErrorMessage(response: Response, fallback: string = 'Request failed'): Promise<string> {
  try {
    const data = await response.clone().json().catch(() => null)
    let message =
      (typeof (data as any)?.detail === 'string' && (data as any).detail) ||
      (typeof (data as any)?.error === 'string' && (data as any).error) ||
      fallback

    // Some backends return JSON-string inside detail
    try {
      const inner = JSON.parse(message)
      if (inner?.detail) message = inner.detail
    } catch {}

    return message
  } catch {
    return fallback
  }
}


