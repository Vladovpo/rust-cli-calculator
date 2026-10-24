<script setup lang="ts">
import type { Template } from '~/utils/demo'

const { isAdmin } = useRole()
const showNewPayment = ref(false)

// stopped payments stay in history but are hidden unless asked for
const showStopped = ref(false)
const payments = usePayments()
onMounted(payments.load)
const stoppedCount = computed(() => payments.templates.value.filter(item => item.ended).length)

// search in one field
const searchField = ref('title')
const searchQuery = ref('')
const searchFields = [
  { value: 'title', label: 'Названию' },
  { value: 'category', label: 'Категории' },
  { value: 'amount', label: 'Сумме' },
  { value: 'currency', label: 'Валюте' },
  { value: 'frequency', label: 'Периодичности' },
  { value: 'who', label: 'Ответственному' },
  { value: 'nextDue', label: 'Следующему сроку' },
]
const fieldValue = (item: Template) => searchField.value === 'who' ? item.who.name : item[searchField.value as keyof Template]

const shown = computed(() => payments.templates.value
  .filter(item => showStopped.value || !item.ended)
  .filter(item => matchesSearch(fieldValue(item), searchQuery.value)))

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

    <div class="tools">
      <FieldSearch v-model:field="searchField" v-model:query="searchQuery" :fields="searchFields" />
      <UiSwitch v-model="showStopped">Показать прекращённые <span class="mono muted">{{ stoppedCount }}</span></UiSwitch>
    </div>

    <UiState v-if="payments.pending.value" class="state">Загружаем платежи…</UiState>
    <UiState v-else-if="payments.loadError.value" kind="error" class="state" @retry="payments.load">
      Не удалось загрузить: {{ payments.loadError.value }}
    </UiState>
    <UiState v-else-if="!shown.length && searchQuery.trim()" class="state">
      Ничего не нашлось.
      <br>
      <button type="button" class="reset" @click="searchQuery = ''">Очистить поиск</button>
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
.tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: -6px 0 12px;
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
