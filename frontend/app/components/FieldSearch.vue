<script setup lang="ts">
import type { DropdownOption } from '~/components/ui/Dropdown.vue'

// search in one field: pick the field, type the text. the screen does the matching
defineProps<{ fields: DropdownOption[] }>()

const field = defineModel<string>('field', { required: true })
const query = defineModel<string>('query', { default: '' })
</script>

<template>
  <div class="search">
    <UiDropdown v-model="field" :options="fields" :clearable="false" placeholder="поле" prefix="Поиск по:" compact class="field" />
    <label class="box">
      <UiIcon name="search" :size="14" class="icon" />
      <input v-model="query" class="input" placeholder="Что найти" aria-label="Текст для поиска" maxlength="100">
      <button v-if="query" type="button" class="clear" aria-label="Очистить поиск" @click="query = ''">
        <UiIcon name="close" :size="12" />
      </button>
    </label>
  </div>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field {
  min-width: 190px;
}

.box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 200px;
  height: 34px;
  padding: 0 12px 0 14px;
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: 9999px;
  font-size: 13px;
}

.box:focus-within {
  border-color: var(--ink-2);
  box-shadow: 0 0 0 3px var(--subtle);
}

.icon {
  flex-shrink: 0;
  color: var(--ink-3);
}

.box:focus-within .icon {
  color: var(--ink);
}

.input {
  flex: 1;
  min-width: 0;
  padding: 0;
  background: none;
  border: 0;
  outline: none;
}

.input::placeholder {
  color: var(--ink-3);
}

.clear {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  padding: 0;
  background: none;
  border: 0;
  border-radius: 50%;
  color: var(--ink-3);
}

.clear:hover {
  background: var(--subtle);
  color: var(--ink);
}
</style>
