<script setup lang="ts">
import type { Template } from '~/utils/periods'

const { isAdmin } = useRole()
const showNewPayment = ref(false)

const payments = usePayments()
onMounted(payments.load)

// the same filters as on «Периоды»: status, currencies, who pays.
// stopped payments stay in history, the list opens on the running ones
const status = ref('active')
const currencies = ref<string[]>(['RUB', 'USD', 'EUR'])
const currencyOptions = [
  { value: 'RUB', label: 'RUB', symbol: '₽' },
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
]

// '' = everyone, otherwise the person's full name
const assignee = ref('')
const assigneeOptions = computed(() => payments.assignees.value
  .map(({ person }) => ({ value: person.name, label: person.short, meta: person.persona })))

// currency and assignee first, the status filter goes on top of that
const filtered = computed(() => payments.templates.value.filter(item => currencies.value.includes(item.currency)
  && (!assignee.value || item.who.name === assignee.value)))

// no counts until the payments arrive, a row of zeros would look like there is nothing
const statusOptions = computed(() => {
  const loaded = payments.ready.value
  const stopped = filtered.value.filter(item => item.ended).length
  return [
    { value: 'all', label: 'Все', count: loaded ? filtered.value.length : undefined },
    { value: 'active', label: 'Активные', count: loaded ? filtered.value.length - stopped : undefined },
    { value: 'ended', label: 'Прекращённые', count: loaded ? stopped : undefined },
  ]
})

const shown = computed(() => filtered.value.filter(item => status.value === 'all'
  || (status.value === 'ended' ? item.ended : !item.ended)))

const { withTransition, transitioned } = useViewTransition()
const statusModel = transitioned(status)
const currenciesModel = transitioned(currencies)
const assigneeModel = transitioned(assignee)

const isFiltered = computed(() => status.value !== 'active' || currencies.value.length < 3 || !!assignee.value)
function resetFilters() {
  withTransition(() => {
    status.value = 'active'
    currencies.value = ['RUB', 'USD', 'EUR']
    assignee.value = ''
  })
}

function stop(template: Template) {
  payments.stop(template).catch(() => {})
}
</script>

<template>
  <div>
    <AppPageHeader
      title="Регулярные платежи"
      :subtitle="isAdmin
        ? 'Шаблоны: из них автоматически создаются периоды и напоминания'
        : 'Что, сколько и кто платит — периоды создаются автоматически'"
    >
      <template v-if="isAdmin" #actions>
        <UiButton variant="primary" class="new" @click="showNewPayment = true">Новый платёж</UiButton>
      </template>
    </AppPageHeader>

    <div class="filters">
      <UiSegmented v-model="statusModel" :options="statusOptions" />
      <UiChips v-model="currenciesModel" :options="currencyOptions" />
      <UiDropdown v-model="assigneeModel" :options="assigneeOptions" prefix="Ответственный:" placeholder="все" compact class="assignee" />
    </div>

    <RecurringTable v-if="payments.pending.value" :templates="[]" loading />
    <UiState v-else-if="payments.loadError.value" kind="error" class="state" @retry="payments.load">
      Не удалось загрузить: {{ payments.loadError.value }}
    </UiState>
    <UiState v-else-if="!shown.length && isFiltered" class="state">
      Под эти фильтры нет ни одного платежа.
      <br>
      <button type="button" class="reset" @click="resetFilters">Сбросить фильтры</button>
    </UiState>
    <UiState v-else-if="!shown.length" class="state">
      {{ isAdmin ? 'Регулярных платежей пока нет. Добавьте первый — «Новый платёж».' : 'Регулярных платежей пока нет.' }}
    </UiState>
    <RecurringTable v-else :templates="shown" @stop="stop" />

    <p v-if="!isAdmin" class="read-only">
      <span class="dot" />
      Только просмотр: добавлять и прекращать регулярные платежи может администратор.
    </p>

    <Transition name="modal">
      <NewPaymentModal v-if="showNewPayment" @close="showNewPayment = false" />
    </Transition>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}

/* grows to fit the picked name, up to a limit */
.assignee {
  flex: 0 1 auto;
  min-width: 220px;
  max-width: 280px;
  margin-left: auto;
}

.reset {
  margin-top: 10px;
  padding: 0;
  background: none;
  border: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-ink);
}

.read-only {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  font-size: 13px;
  color: var(--ink-3);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink-3);
}

.new {
  width: 160px;
}

.state {
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
</style>
