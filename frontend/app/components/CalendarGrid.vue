<script setup lang="ts">
import type { Period } from '~/utils/demo'

const { withTransition } = useViewTransition()

const props = defineProps<{
  year: number
  // 0 = january
  month: number
  today: number
  periods: Period[]
}>()

const selected = defineModel<Period>('selected')

// the side panel morphs to the new payment instead of jumping
function select(period: Period) {
  withTransition(() => { selected.value = period })
}

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// as many weeks as the month touches (5 or 6), starting from the monday before the 1st
const weeks = computed(() => {
  const shift = (new Date(props.year, props.month, 1).getDay() + 6) % 7
  const days = new Date(props.year, props.month + 1, 0).getDate()
  return Math.ceil((shift + days) / 7)
})

// every payment of the day is shown, they shrink to fit the cell (rows are 124px).
// first one column of pills, a bit lower when there are more of them; when that gets too
// small to read, they go into a grid of 2, then 3 columns
const area = 80
const minHeight = 16

function layout(count: number) {
  for (const cols of [1, 2, 3]) {
    const rows = Math.ceil(count / cols)
    const gap = rows * 22 + (rows - 1) * 4 <= area ? 4 : 2
    const height = Math.min(22, Math.floor((area - (rows - 1) * gap) / rows))
    // past 3 columns the row of the calendar grows instead
    if (height >= minHeight || cols === 3) return { cols, gap, height: Math.max(height, minHeight) }
  }
  return { cols: 3, gap: 2, height: minHeight }
}

const cells = computed(() => monthCells(props.year, props.month, weeks.value).map((cell) => {
  const onDay = cell.inMonth ? props.periods.filter(p => fromRu(p.due) === cell.iso) : []
  return {
    ...cell,
    key: cell.iso,
    day: String(cell.day).padStart(2, '0'),
    today: cell.inMonth && cell.day === props.today,
    payments: onDay,
    layout: layout(onDay.length),
  }
}))
</script>

<template>
  <div class="grid" :style="{ '--weeks': weeks }">
    <span v-for="name in weekdays" :key="name" class="weekday" :class="{ off: name === 'Сб' || name === 'Вс' }">
      {{ name }}
    </span>

    <div v-for="cell in cells" :key="cell.key" class="cell" :class="{ weekend: cell.weekend }">
      <span v-if="cell.today" class="today"><span class="circle">{{ cell.day }}</span>сегодня</span>
      <span v-else class="day mono" :class="{ other: !cell.inMonth }">{{ cell.day }}</span>

      <!-- only the name here, amount and the rest are in the side panel -->
      <div
        v-if="cell.payments.length"
        class="payments"
        :class="{ small: cell.layout.height < 22 || cell.layout.cols > 1, grid2: cell.layout.cols === 2, grid3: cell.layout.cols === 3 }"
        :style="{ '--cols': cell.layout.cols, '--gap': `${cell.layout.gap}px`, '--chip-h': `${cell.layout.height}px` }"
      >
        <button
          v-for="period in cell.payments"
          :key="period.id"
          type="button"
          class="payment"
          :class="[period.status, { selected: selected?.id === period.id }]"
          :title="`${period.title} · ${period.amount}`"
          @click="select(period)"
        >
          <span class="dot" /><span class="name">{{ period.title }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  /* a very busy day (more than three columns of payments) makes its row taller */
  grid-template-rows: 30px repeat(var(--weeks), minmax(124px, auto));
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.weekday {
  padding: 7px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-3);
}

.weekday.off {
  color: var(--ink-3);
  opacity: 0.7;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 10px 6px 6px;
  border-top: 1px solid var(--line);
  border-left: 1px solid var(--line);
}

.cell:nth-child(7n + 1) {
  border-left: 0;
}

/* first week row has no line above, the weekday header has one */
.cell:nth-child(-n + 14) {
  border-top: 0;
}

.cell.weekend {
  background: color-mix(in srgb, var(--subtle) 50%, transparent);
}

.day {
  margin-bottom: 4px;
  padding-left: 6px;
  font-size: 13px;
  font-weight: 500;
}

.day.other {
  color: var(--ink-3);
  font-weight: 400;
}

.today {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -4px 0 -5px;
  font-size: 11px;
  font-weight: 500;
  color: var(--accent-ink);
}

.circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 26px;
  text-align: center;
}

.payments {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  grid-auto-rows: var(--chip-h);
  gap: var(--gap);
}

.payment {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: var(--chip-h);
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  transition: border-color 0.2s ease, transform 0.35s var(--ease-out), filter 0.2s ease;
}

/* lower pills or a grid of them: a smaller font and less padding so the names still read */
.small .payment {
  gap: 4px;
  padding: 0 6px;
  font-size: 11px;
}

/* in a grid the pill's colour already tells the status, the dot only takes room */
.grid2 .dot,
.grid3 .dot {
  display: none;
}

/* three columns are too narrow for a name: just the coloured tiles, the name is in the tooltip */
.grid3 .payment {
  padding: 0;
}

.grid3 .name {
  display: none;
}

.payment:hover {
  transform: translateX(2px);
  filter: brightness(1.08);
}

.name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* same colours as the status badges */
.payment.pending { background: var(--accent-bg); color: var(--accent-ink); }
.payment.paid { background: var(--green-bg); color: var(--green); }
.payment.late { background: var(--amber-bg); color: var(--amber); }
.payment.overdue { background: var(--red-bg); color: var(--red); }
.payment.ended { background: var(--subtle); color: var(--ink-3); }

.payment.selected {
  border-color: currentColor;
}
</style>
