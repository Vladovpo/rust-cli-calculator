<script setup lang="ts">
import type { Template, TemplateColumnFilters } from '~/utils/periods'

// unit: the sign of the one picked currency, '' when there are several (then amounts can't be filtered)
const props = withDefaults(defineProps<{ templates: Template[], loading?: boolean, unit?: string }>(), { unit: '' })
const emit = defineEmits<{ stop: [template: Template] }>()

// a filter per column, '' = off. the screen sends them to the server (GET /recurring-payments/search).
// currency and who pays are filtered above the table
const filters = defineModel<TemplateColumnFilters>('filters', { required: true })

// the server knows two kinds: by weeks and by months (quarterly and yearly are «every 3 / 12 months»)
const frequencyOptions = [
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно, ежеквартально, ежегодно' },
]

// stopping can't be undone, so the first click only asks
const confirming = ref<string>()
function stop(item: Template) {
  if (confirming.value !== item.id) {
    confirming.value = item.id
    return
  }
  confirming.value = undefined
  emit('stop', item)
}
const { isAdmin } = useRole()

// soonest next due date first, stopped ones (no next date) at the end
const sorted = computed(() => [...props.templates].sort((a, b) =>
  (a.nextDue ? fromRu(a.nextDue) : '9999').localeCompare(b.nextDue ? fromRu(b.nextDue) : '9999')))

const { visible, hasMore, sentinel } = useLazyList(sorted)
</script>

<template>
  <div class="table" :class="{ admin: isAdmin }">
    <div class="row head">
      <span class="mono muted">№</span>
      <TableFilter v-model="filters.title" label="Название" />
      <TableFilter
        v-model:from="filters.amountFrom"
        v-model:to="filters.amountTo"
        label="Сумма"
        range="amount"
        :unit="unit"
        :blocked="unit ? '' : 'Сумму можно искать в одной валюте: оставьте одну в фильтре сверху'"
        right
      />
      <span class="currency">Валюта</span>
      <TableFilter v-model="filters.frequency" label="Периодичность" :options="frequencyOptions" />
      <span>Ответственный</span>
      <TableFilter v-model:from="filters.nextFrom" v-model:to="filters.nextTo" label="Следующий срок" range="date" />
      <span>Статус</span>
      <span v-if="isAdmin" />
    </div>

    <!-- grey rows of the same size until the payments arrive -->
    <template v-if="loading">
      <div v-for="n in 4" :key="`s${n}`" class="row">
        <span />
        <span class="stack"><UiSkeleton width="150px" /><UiSkeleton width="90px" height="10px" /></span>
        <UiSkeleton width="90px" class="end" />
        <UiSkeleton width="30px" height="10px" class="currency-skeleton" />
        <span class="stack"><UiSkeleton width="90px" /><UiSkeleton width="60px" height="10px" /></span>
        <UiSkeleton width="110px" />
        <UiSkeleton width="80px" />
        <UiSkeleton width="70px" height="20px" />
        <span v-if="isAdmin" />
      </div>
    </template>

    <div
      v-for="(item, i) in visible"
      :key="item.id"
      class="row rise"
      :class="{ ended: item.ended }"
      :style="{ viewTransitionName: `template-${item.id}`, '--i': i }"
    >
      <span class="mono muted small">{{ String(i + 1).padStart(2, '0') }}</span>
      <span>
        <span class="title">{{ item.title }}</span>
        <span class="small muted">{{ item.category }}</span>
      </span>
      <span class="mono strong right dim">{{ item.amount }}</span>
      <span class="mono small muted currency">{{ item.currency }}</span>
      <span>
        <span class="dim">{{ item.frequency }}</span>
        <span class="small muted">{{ item.day }}</span>
      </span>
      <PersonCell :person="item.who" />
      <span class="mono dim">{{ item.nextDue ?? '—' }}</span>
      <span v-if="item.ended" class="muted">Прекращён</span>
      <UiStatus v-else status="active" />
      <!-- «История» waits for the backend -->
      <template v-if="isAdmin">
        <button
          v-if="!item.ended"
          type="button"
          class="action"
          :class="{ confirm: confirming === item.id }"
          @click="stop(item)"
          @blur="confirming = undefined"
        >
          {{ confirming === item.id ? 'Точно прекратить?' : 'Прекратить' }}
        </button>
        <button v-else type="button" class="action text-action soon" disabled :title="soonHint">История</button>
      </template>
    </div>
    <div v-if="hasMore" ref="sentinel" class="sentinel" />
  </div>
</template>

<style scoped>
/* no box around it: rows run the full width, separated by hairlines.
   the negative margin lets hover fills reach a little past the text edge */
.table {
  position: relative;
  margin: 0 -12px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}

.row:not(.head):hover {
  background: var(--subtle);
}

.row {
  display: grid;
  /* the spare width is shared between the columns, so the gaps stay even */
  grid-template-columns: 36px minmax(190px, 2.2fr) minmax(100px, 1fr) 80px minmax(140px, 1.4fr) minmax(140px, 1.4fr) minmax(100px, 1fr) minmax(100px, 1fr);
  align-items: center;
  height: 56px;
  padding: 0 12px;
  border-top: 1px solid var(--line);
  white-space: nowrap;
}

.admin .row {
  grid-template-columns: 36px minmax(190px, 2.2fr) minmax(100px, 1fr) 80px minmax(140px, 1.4fr) minmax(140px, 1.4fr) minmax(100px, 1fr) minmax(100px, 1fr) 130px;
}

/* header: plain small text, the hairline under it does the separating.
   above the rows, so a filter menu isn't hidden under them */
.row.head {
  position: relative;
  z-index: 4;
  height: 40px;
  border-top: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-3);
}

.title {
  display: block;
  font-size: 14px;
  font-weight: 500;
}

.small {
  display: block;
  font-size: 12px;
}

.strong {
  font-weight: 500;
}

.currency {
  padding-left: 20px;
}

/* stopped payment: everything grey except who pays */
.ended .title,
.ended .dim {
  color: var(--ink-3);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.end {
  justify-self: end;
}

.currency-skeleton {
  margin-left: 20px;
}

.sentinel {
  height: 1px;
}

.action {
  background: none;
  border: 0;
  padding: 0;
  font-size: 13px;
  color: var(--ink-2);
  text-align: right;
  justify-self: end;
}

.action.confirm {
  color: var(--red);
  font-weight: 500;
}
</style>
