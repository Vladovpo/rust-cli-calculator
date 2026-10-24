<script setup lang="ts">
import type { CurrencyTotal, Period } from '~/utils/demo'

const props = withDefaults(defineProps<{
  periods: Period[]
  totals: CurrencyTotal[]
  filtered?: boolean
  month?: string
  loading?: boolean
}>(), { month: 'октябрь' })
defineEmits<{ reset: [] }>()

// a filter per column, '' = off. they will go to the server as query params,
// it can't filter yet, so the column titles show «скоро» for now
const filters = reactive({ title: '', due: '', amount: '', paidAt: '' })

const payments = usePayments()
const { visible, hasMore, sentinel } = useLazyList(() => props.periods)

// id of the row whose "mark paid" popover is open
const open = ref<string>()

// where the popover sits inside the row: its top left corner at the click
const at = ref({ x: 0, y: 0 })

// a paid row opens too: to fix the date or take the mark off
async function toggle(period: Period, e: MouseEvent) {
  if (!clickable(period)) return
  if (open.value === period.id) {
    open.value = undefined
    return
  }
  const row = e.currentTarget as HTMLElement
  const box = row.getBoundingClientRect()
  at.value = { x: e.clientX - box.left, y: e.clientY - box.top }
  open.value = period.id

  // near the right or bottom edge of the window it opens to the other side of the click
  await nextTick()
  const popover = row.querySelector<HTMLElement>('.popover')
  if (!popover) return
  const gap = 12
  if (e.clientX + popover.offsetWidth + gap > window.innerWidth) at.value.x -= popover.offsetWidth
  if (e.clientY + popover.offsetHeight + gap > window.innerHeight) at.value.y -= popover.offsetHeight
}

const clickable = (period: Period) => period.status !== 'ended' && payments.canMark(period)
</script>

<template>
  <div class="table">
    <div class="row head">
      <span class="mono muted">№</span>
      <TableFilter v-model="filters.title" label="Название" soon />
      <span>Ответственный</span>
      <TableFilter v-model="filters.due" label="Срок" soon />
      <TableFilter v-model="filters.amount" label="Сумма" right soon />
      <span class="currency">Валюта</span>
      <span>Статус</span>
      <TableFilter v-model="filters.paidAt" label="Дата оплаты" soon />
      <span class="right">Просрочка</span>
    </div>

    <div
      v-for="(period, i) in visible"
      :key="period.id"
      class="row rise"
      :class="{ overdue: period.status === 'overdue', clickable: clickable(period), 'has-popover': open === period.id }"
      :style="{ viewTransitionName: `row-${period.id}`, '--i': i }"
      @click="toggle(period, $event)"
    >
      <span class="mono muted small">{{ String(i + 1).padStart(2, '0') }}</span>
      <span>
        <span class="title">{{ period.title }}</span>
        <span class="small muted">{{ period.frequency }}</span>
      </span>
      <PersonCell :person="period.who" />
      <span>
        <span class="mono">{{ period.due }}</span>
        <span
          v-if="period.relative"
          class="small"
          :class="period.status === 'overdue' ? 'red' : period.relative === 'завтра' ? '' : 'muted'"
        >{{ period.relative }}</span>
      </span>
      <span class="mono strong right">{{ period.amount }}</span>
      <span class="mono small muted currency">{{ period.currency }}</span>
      <UiStatus :status="period.status" />
      <span class="mono" :class="{ muted: !period.paidAt }">{{ period.paidAt ?? '—' }}</span>
      <span class="mono right" :class="period.status === 'overdue' ? 'red strong' : period.status === 'late' ? 'amber strong' : 'muted'">
        {{ period.overdue ?? '—' }}
      </span>

      <Transition name="menu">
        <MarkPaidPopover
          v-if="open === period.id"
          :period="period"
          class="popover"
          :style="{ left: `${at.x}px`, top: `${at.y}px` }"
          @close="open = undefined"
        />
      </Transition>
    </div>

    <div v-if="hasMore" ref="sentinel" class="sentinel" />

    <!-- nothing matched: say so and offer a way out -->
    <template v-if="loading">
      <div v-for="n in 4" :key="n" class="row">
        <span /><span class="skeleton-stack"><UiSkeleton width="160px" /><UiSkeleton width="90px" height="10px" /></span>
        <UiSkeleton width="100px" /><UiSkeleton width="80px" /><UiSkeleton width="90px" class="right-skeleton" />
      </div>
    </template>
    <UiState v-else-if="!periods.length" class="empty">
      {{ filtered ? 'Под эти фильтры нет ни одного платежа.' : 'Платежей пока нет.' }}
      <template v-if="filtered">
        <br>
        <button type="button" class="reset" @click="$emit('reset')">Сбросить фильтры</button>
      </template>
    </UiState>

    <div v-else class="foot">
      <span>
        <span class="title">Итого за {{ month }}</span>
        <span class="small muted">по каждой валюте отдельно</span>
      </span>
      <span v-for="total in totals" :key="total.code" class="foot-total">
        <span class="mono small soft strong">{{ total.code }}</span>
        <span>
          <span class="mono strong">{{ total.total }}</span>
          <span class="mono small muted">оплачено {{ total.paid }}</span>
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
/* filter changes: the table resizes, rows slide to their new place (useViewTransition) */
/* no box around it: rows run the full width, separated by hairlines.
   the negative margin lets hover fills reach a little past the text edge */
.table {
  view-transition-name: payments-table;
  position: relative;
  margin: 0 -12px;
  font-size: 13px;
}

.row {
  position: relative;
  display: grid;
  grid-template-columns: 36px 224px 150px 110px 140px 90px 190px 90px 74px;
  align-items: center;
  height: 56px;
  padding: 0 12px;
  border-top: 1px solid var(--line);
}

/* header: plain small text, the hairline under it does the separating.
   above the rows, so a filter menu isn't hidden under them */
.row.head {
  z-index: 4;
  height: 40px;
  border-top: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-3);
}

/* every row is its own layer (view-transition-name), so the one with the popover
   has to sit above the rows and footer below it */
.row.has-popover {
  z-index: 3;
}

.row.clickable {
  cursor: pointer;
}

.row.clickable:hover {
  background: var(--subtle);
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

.red { color: var(--red); }
.amber { color: var(--amber); }

/* opens where the row was clicked (left / top set in toggle), grows out of that corner */
.popover {
  position: absolute;
  z-index: 2;
  cursor: default;
  transform-origin: top left;
}

.sentinel {
  height: 1px;
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

.foot {
  view-transition-name: payments-foot;
  display: flex;
  align-items: center;
  height: 63px;
  padding: 0 12px;
  border-top: 1px solid var(--line-strong);
  border-bottom: 1px solid var(--line);
}

.foot > span:first-child {
  width: 180px;
  font-size: 13px;
}

.foot > span:first-child .title {
  font-size: 13px;
}

.foot-total {
  display: flex;
  gap: 12px;
  width: 220px;
}

.skeleton-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.right-skeleton {
  justify-self: end;
}
</style>
