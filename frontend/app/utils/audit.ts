// words for the journal: what kind of thing changed, through which channel, and its fields
import type { AuditLogItem } from '~/types/api'

export const entityNames: Record<string, string> = {
  user: 'Пользователь',
  telegram_link: 'Привязка Telegram',
  telegram_chat: 'Командный чат',
  persona: 'Должность',
  recurring_payment: 'Регулярный платёж',
  occurrence: 'Период',
  notification_settings: 'Напоминания на почту',
  assistant_turn: 'Вопрос ассистенту',
  assistant_conversation: 'Диалог с ассистентом',
}

export const channelNames: Record<string, string> = {
  web: 'Панель',
  miniapp: 'Mini App',
  bot: 'Бот',
  system: 'Система',
}

const fieldNames: Record<string, string> = {
  amount: 'Сумма',
  currency: 'Валюта',
  description: 'Название',
  due_date: 'Срок',
  paid_date: 'Дата оплаты',
  paid_late: 'С опозданием',
  start_date: 'Первый срок',
  frequency: 'Периодичность',
  interval: 'Интервал',
  assignee_id: 'Ответственный',
  login: 'Логин',
  full_name: 'Имя',
  name: 'Название',
  email: 'Почта',
  email_enabled: 'Письма',
  days_before_due: 'Дней до срока',
  send_time: 'Время отправки',
  timezone: 'Часовой пояс',
  reason: 'Причина',
  actor_id: 'Кто',
}

// the server still says «персона» in a few labels, the panel calls it «должность»
export function actionLabel(label = '', action = ''): string {
  if (action.startsWith('persona.')) return label.replace(/персона/i, 'должность')
  return label || action
}

export const fieldName = (key: string) => fieldNames[key] ?? key

// one value as a person reads it: kopecks as rubles, dates as dd.mm.yyyy, yes/no
export function fieldValue(key: string, value: unknown, currency?: string): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'да' : 'нет'
  if (key === 'amount' && typeof value === 'number') return currency ? money(value, currency) : formatAmount(value / 100)
  if (key === 'frequency') return value === 'weekly' ? 'еженедельно' : value === 'monthly' ? 'ежемесячно' : String(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return toRu(value.slice(0, 10))
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// the currency of the entry, so amounts can be shown with their sign
export function currencyOf(item: AuditLogItem): string | undefined {
  const fromChanges = item.changes?.currency?.to
  const fromPayload = item.payload?.currency
  const value = typeof fromChanges === 'string' ? fromChanges : fromPayload
  return typeof value === 'string' ? value : undefined
}

// «Сумма: 1 000 ₽ → 1 500 ₽», for the row and the details
export function changeLines(item: AuditLogItem): string[] {
  const currency = currencyOf(item)
  return Object.entries(item.changes ?? {}).map(([key, change]) =>
    `${fieldName(key)}: ${fieldValue(key, change?.from, currency)} → ${fieldValue(key, change?.to, currency)}`)
}

// what the entry was about, from its payload: «Аренда офиса · 1 500 ₽»
export function payloadLines(item: AuditLogItem): string[] {
  const currency = currencyOf(item)
  return Object.entries(item.payload ?? {})
    .filter(([key]) => key !== 'currency' || !item.payload?.amount)
    .map(([key, value]) => `${fieldName(key)}: ${fieldValue(key, value, currency)}`)
}
