// "2026-10-23T17:32:30Z" -> "23.10.2026", in the app's timezone
export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' })
}

// "Ольга Иванова" -> "ОИ", "Администратор" -> "АД"
export function initials(name?: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? '').slice(0, 2)
  return letters.toUpperCase()
}

// does the text contain what was typed? case and spaces don't matter, so "120000" finds "120 000,00 ₽"
export function matchesSearch(value: unknown, query: string): boolean {
  const clean = (text: string) => text.toLowerCase().replace(/\s/g, '')
  const wanted = clean(query)
  if (!wanted) return true
  return typeof value === 'string' && clean(value).includes(wanted)
}
