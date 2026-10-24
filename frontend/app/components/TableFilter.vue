<!-- a column title that filters its column. a click opens a small menu with:
     a text field (default), the values to pick from (`options`), or two fields «с / по» (`range`).
     '' means no filter -->
<script setup lang="ts">
import type { DropdownOption } from '~/components/ui/Dropdown.vue'

const props = withDefaults(defineProps<{
  label: string
  options?: DropdownOption[]
  // two fields: dates (YYYY-MM-DD) or amounts (in rubles / dollars / euros)
  range?: 'date' | 'amount'
  // the sign after the amount fields, e.g. ₽
  unit?: string
  // the filter can't be used right now, this says why (e.g. an amount needs one currency)
  blocked?: string
  // the menu opens to the left, for columns aligned to the right
  right?: boolean
  // the server can't filter by this column yet: shown as «скоро», can't be opened
  soon?: boolean
}>(), { options: undefined, range: undefined, unit: '', blocked: '', right: false, soon: false })

const model = defineModel<string>({ default: '' })
const from = defineModel<string>('from', { default: '' })
const to = defineModel<string>('to', { default: '' })
const active = computed(() => !!(model.value || from.value || to.value))

const open = ref(false)
const root = ref<HTMLElement>()
useClickOutside(root, () => { open.value = false }, open)

// the first field is ready to type into as soon as the menu opens
watch(open, (value) => {
  if (value && !props.options) nextTick(() => root.value?.querySelector<HTMLInputElement>('.menu input')?.focus())
})

const current = computed(() => props.options?.find(option => option.value === model.value))

// what's set, for the tooltip: «Срок: с 01.10.2026 по 15.10.2026»
const shown = (value: string) => (props.range === 'date' ? toRu(value) : `${value} ${props.unit}`.trim())
const summary = computed(() => {
  if (props.range) return [from.value && `с ${shown(from.value)}`, to.value && `по ${shown(to.value)}`].filter(Boolean).join(' ')
  return current.value?.label ?? model.value
})

function pick(value: string) {
  model.value = value
  open.value = false
}

function reset() {
  model.value = ''
  from.value = ''
  to.value = ''
  open.value = false
}
</script>

<template>
  <span ref="root" class="filter" :class="{ right }">
    <button
      type="button"
      class="trigger"
      :class="{ active, open, soon, 'text-action': soon }"
      :disabled="soon"
      :title="soon ? 'Фильтр появится, когда сервер научится фильтровать' : active ? `${label}: ${summary}` : `Фильтр: ${label.toLowerCase()}`"
      @click="open = !open"
    >
      <span v-if="active" class="dot" />{{ label }}
      <UiIcon v-if="!soon" name="down" :size="12" class="caret" :class="{ flip: open }" />
    </button>

    <Transition name="menu">
      <div v-if="open" class="menu">
        <template v-if="options">
          <button type="button" class="option" :class="{ active: !model }" @click="pick('')">
            <span>Все</span><span class="check">{{ model ? '' : '✓' }}</span>
          </button>
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            class="option"
            :class="{ active: option.value === model }"
            @click="pick(option.value)"
          >
            <span>{{ option.label }}</span>
            <span class="meta mono">{{ option.meta }}</span>
            <span class="check">{{ option.value === model ? '✓' : '' }}</span>
          </button>
        </template>

        <p v-else-if="blocked" class="blocked">{{ blocked }}</p>

        <template v-else-if="range">
          <div class="range">
            <label class="range-row">
              <span class="range-label">{{ range === 'date' ? 'С' : 'От' }}</span>
              <UiInput
                v-model="from"
                :type="range === 'date' ? 'date' : 'text'"
                :filter="range === 'amount' ? moneyFilter : undefined"
                :suffix="range === 'amount' ? unit : ''"
                :inputmode="range === 'amount' ? 'decimal' : undefined"
                mono
                class="range-input"
                :aria-label="`${label}: ${range === 'date' ? 'с' : 'от'}`"
                @keydown.enter="open = false"
              />
            </label>
            <label class="range-row">
              <span class="range-label">{{ range === 'date' ? 'По' : 'До' }}</span>
              <UiInput
                v-model="to"
                :type="range === 'date' ? 'date' : 'text'"
                :filter="range === 'amount' ? moneyFilter : undefined"
                :suffix="range === 'amount' ? unit : ''"
                :inputmode="range === 'amount' ? 'decimal' : undefined"
                mono
                class="range-input"
                :aria-label="`${label}: ${range === 'date' ? 'по' : 'до'}`"
                @keydown.enter="open = false"
              />
            </label>
          </div>
          <button v-if="active" type="button" class="clear" @click="reset">Сбросить</button>
        </template>

        <template v-else>
          <UiInput v-model="model" class="text" placeholder="Содержит…" :aria-label="label" maxlength="100" @keydown.enter="open = false" />
          <button v-if="model" type="button" class="clear" @click="reset">Сбросить</button>
        </template>
      </div>
    </Transition>
  </span>
</template>

<style scoped>
.filter {
  position: relative;
  display: inline-flex;
  min-width: 0;
}

.filter.right {
  justify-self: end;
}

/* looks like the plain column title until hovered or used */
.trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 -6px;
  padding: 2px 6px;
  background: none;
  border: 0;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-3);
  white-space: nowrap;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.trigger:hover,
.trigger.open {
  background: var(--subtle);
  color: var(--ink);
}

.trigger.active {
  color: var(--accent-ink);
}

.caret {
  opacity: 0.6;
  transition: transform 0.35s var(--ease-out), opacity 0.2s ease;
}

.trigger:hover .caret,
.trigger.active .caret {
  opacity: 1;
}

.caret.flip {
  transform: rotate(180deg);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.menu {
  position: absolute;
  top: calc(100% + 8px);
  left: -6px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  width: max-content;
  padding: 4px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow-pop);
  font-size: 13px;
  font-weight: 400;
  color: var(--ink);
}

.right .menu {
  left: auto;
  right: -6px;
}

.text {
  width: 220px;
  margin: 4px;
}

.option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  background: none;
  border: 0;
  border-radius: 9999px;
  text-align: left;
  white-space: nowrap;
}

.option:hover {
  background: var(--subtle);
}

.option.active {
  background: var(--subtle);
  font-weight: 500;
}

.meta {
  margin-left: auto;
  font-size: 12px;
  color: var(--ink-3);
}

.check {
  width: 12px;
  margin-left: auto;
  color: var(--accent-ink);
}

.meta + .check {
  margin-left: 0;
}

.range {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 4px;
}

.range-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.range-label {
  width: 22px;
  font-size: 12px;
  color: var(--ink-3);
}

.range-input {
  width: 190px;
}

/* why the filter can't be used right now */
.blocked {
  max-width: 240px;
  margin: 6px 10px;
  font-size: 13px;
  line-height: 18px;
  color: var(--ink-2);
}

.clear {
  align-self: flex-start;
  margin: 2px 10px 6px;
  padding: 0;
  background: none;
  border: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-ink);
}
</style>
