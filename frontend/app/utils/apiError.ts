// turns a failed request into a message for the screen.
// backend answers either with plain text or with { error: { message } }.
// when the backend itself is down, the proxy in front of it (nginx) answers with an html page:
// that one is never shown as is, the person gets a plain sentence instead
export function apiError(e: unknown): string {
  const err = e as { statusCode?: number, data?: unknown }
  const status = err.statusCode

  const text = typeof err.data === 'string' ? err.data.trim() : ''
  // an html page or a huge dump is for developers, not for the screen
  const readable = text && !/<[a-z!/]/i.test(text) && text.length <= 200
  if (readable) return text

  const message = (err.data as { error?: { message?: string } } | undefined)?.error?.message
  if (message) return message

  return statusText(status)
}

// what the status alone tells us, in words
function statusText(status?: number): string {
  if (!status) return 'Сервер не отвечает. Проверьте интернет и попробуйте ещё раз'
  if (status === 502 || status === 503 || status === 504) return 'Сервер временно недоступен. Попробуйте чуть позже'
  if (status >= 500) return 'Ошибка на сервере. Попробуйте ещё раз'
  if (status === 429) return 'Слишком много попыток, попробуйте позже'
  if (status === 404) return 'Не найдено'
  if (status === 403) return 'Недостаточно прав'
  if (status === 401) return 'Нужно войти заново'
  return `Ошибка ${status}`
}
