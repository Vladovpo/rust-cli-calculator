<script setup lang="ts">
import type { User } from '~/types/api'

const props = defineProps<{ users: User[], loading?: boolean }>()
defineEmits<{ edit: [user: User] }>()

const { visible, hasMore, sentinel } = useLazyList(() => props.users)

// «Отвечает за»: the user's running recurring payments
const payments = usePayments()
onMounted(payments.load)
const responsibleFor = (id?: string) => payments.templates.value.filter(item => !item.ended && item.assigneeId === id)
const countText = (n: number) => `${n} ${plural(n, ['платёж', 'платежа', 'платежей'])}`

// the list of those payments in a small card under the count, on hover or focus.
// it's drawn over the page (Teleport), the table's round corners would cut it off
const shown = ref<{ id?: string, x: number, y: number }>()
function showList(user: User, e: Event) {
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  shown.value = { id: user.id, x: box.left, y: box.bottom + 6 }
}
</script>

<template>
  <div class="card table">
    <div class="row head">
      <span>Пользователь</span>
      <span>Роль</span>
      <span>Должность</span>
      <span>Отвечает за</span>
      <!-- the server gives telegram only for yourself (/me/telegram), not for each user -->
      <span class="soon text-action" :title="'Появится, когда сервер начнёт отдавать привязку Telegram для каждого пользователя'">Telegram</span>
      <span>Создан</span>
      <span />
    </div>

    <!-- grey placeholder rows until the list arrives -->
    <template v-if="loading">
      <div v-for="n in 4" :key="n" class="row">
        <span class="stack"><UiSkeleton width="140px" /><UiSkeleton width="60px" height="10px" /></span>
        <UiSkeleton width="44px" height="20px" />
        <UiSkeleton width="90px" />
        <UiSkeleton width="16px" />
        <UiSkeleton width="16px" />
        <UiSkeleton width="70px" />
        <span />
      </div>
    </template>

    <div v-for="(user, i) in (loading ? [] : visible)" :key="user.id" class="row rise" :style="{ '--i': i }">
      <span>
        <span class="name">{{ user.full_name }}</span>
        <span class="login mono">{{ user.login }}</span>
      </span>
      <span>
        <span class="role" :class="user.role">{{ roleName(user.role) }}</span>
      </span>
      <span v-if="user.persona">{{ user.persona.name }}</span>
      <span v-else class="muted">—</span>
      <span
        v-if="responsibleFor(user.id).length"
        class="count"
        tabindex="0"
        @mouseenter="showList(user, $event)"
        @mouseleave="shown = undefined"
        @focus="showList(user, $event)"
        @blur="shown = undefined"
      >{{ countText(responsibleFor(user.id).length) }}</span>
      <span v-else class="muted">—</span>
      <span class="muted">—</span>
      <span class="mono soft">{{ formatDate(user.created_at) }}</span>
      <!-- admin comes from .env, can't be edited here -->
      <span v-if="user.role === 'admin'" class="action muted" title="Администратора меняют в настройках сервера">Не изменяется</span>
      <button v-else type="button" class="action soft" @click="$emit('edit', user)">Изменить</button>
    </div>
    <div v-if="hasMore" ref="sentinel" class="sentinel" />

    <Teleport to="body">
      <Transition name="menu">
        <div v-if="shown" class="card payments-list" :style="{ left: `${shown.x}px`, top: `${shown.y}px` }">
          <p class="kicker">Отвечает за</p>
          <div v-for="item in responsibleFor(shown.id)" :key="item.id" class="payment">
            <span class="payment-title">{{ item.title }}</span>
            <span class="mono payment-amount">{{ item.amount }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* dashed underline: there is a list behind it */
.count {
  cursor: default;
  text-decoration: underline dotted var(--ink-3);
  text-underline-offset: 3px;
}

.count:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

/* like the dropdown menus: surface, hairline, round corners, soft shadow */
.payments-list {
  position: fixed;
  z-index: 20;
  min-width: 220px;
  max-width: 320px;
  padding: 10px 12px;
  box-shadow: var(--shadow-pop);
  pointer-events: none;
  transform-origin: top left;
}

.payments-list .kicker {
  margin-bottom: 6px;
}

.payment {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0;
  font-size: 13px;
}

.payment + .payment {
  border-top: 1px solid var(--line);
}

.payment-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-amount {
  flex-shrink: 0;
  color: var(--ink-2);
}

.sentinel {
  height: 1px;
}

/* a rounded card like the job titles next to it, rows separated by hairlines inside.
   overflow keeps the hover fill inside the round corners */
.table {
  flex: 1;
  overflow: hidden;
  font-size: 13px;
}

.row:not(.head):hover {
  background: var(--subtle);
}

.row {
  display: grid;
  grid-template-columns: 180px 120px 130px 88px 70px 90px 1fr;
  align-items: center;
  height: 60px;
  padding: 0 16px;
  border-top: 1px solid var(--line);
  white-space: nowrap;
}

/* header: plain small text, the hairline under it does the separating */
.row.head {
  height: 40px;
  border-top: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-3);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.name {
  display: block;
  font-size: 14px;
  font-weight: 500;
}

.login {
  font-size: 12px;
  color: var(--ink-3);
}

.role {
  display: inline-block;
  height: 22px;
  padding: 0 9px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  line-height: 22px;
}

.role.admin {
  background: var(--ink);
  color: var(--surface);
}

.role.user {
  background: var(--subtle);
  border: 1px solid var(--line);
  color: var(--ink-2);
  line-height: 20px;
}

.action {
  background: none;
  border: 0;
  padding: 0;
  font-size: 13px;
  text-align: right;
}
</style>
