<!-- email reminders of the logged in user, kept on the server (/notifications/settings) -->
<script setup lang="ts">
import type { UserNotificationSettings } from '~/types/api'

const api = useApi()

// undefined while loading, null when they were never set up (the server answers 404)
const saved = ref<UserNotificationSettings | null>()
const loadError = ref('')

const form = reactive({
  email: '',
  // off until there is an email to send to
  enabled: false,
  days: '3',
  time: '09:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow',
})

function fill(settings: UserNotificationSettings) {
  form.email = settings.email ?? ''
  form.enabled = (settings.email_enabled ?? true) && !!form.email
  form.days = String(settings.days_before_due ?? 3)
  form.time = settings.send_time ?? '09:00'
  form.timezone = settings.timezone || form.timezone
}

async function load() {
  loadError.value = ''
  try {
    saved.value = await api.notifications.get()
    fill(saved.value)
  }
  catch (e) {
    if ((e as { statusCode?: number }).statusCode === 404) saved.value = null
    else loadError.value = apiError(e)
  }
}

onMounted(load)

// letters need an address: without one the switch is off and can't be turned on.
// on the first setup typing an email turns it on
const hasEmail = computed(() => /^\S+@\S+\.\S+$/.test(form.email.trim()))
watch(hasEmail, (valid) => {
  if (!valid) form.enabled = false
  else if (!saved.value) form.enabled = true
})

// what sits on the right of each row: a switch, the wide email field, two short fields
const skeletonControls = ['switch', 'wide', 'short-1', 'short-2']

const busy = ref(false)
const error = ref('')
const done = ref(false)

// confirming the address: the server mails a code, the person types it here.
// only for the saved address, a new one in the field has to be saved first
const needsConfirm = computed(() => !!saved.value?.email && !saved.value.email_verified)
const changedEmail = computed(() => form.email.trim() !== (saved.value?.email ?? ''))
const codeSent = ref(false)
const code = ref('')
const confirmBusy = ref(false)
const confirmError = ref('')

async function sendCode() {
  confirmBusy.value = true
  confirmError.value = ''
  try {
    await api.notifications.sendCode()
    codeSent.value = true
    code.value = ''
    nextTick(() => document.querySelector<HTMLInputElement>('.code input')?.focus())
  }
  catch (e) {
    confirmError.value = apiError(e)
  }
  finally {
    confirmBusy.value = false
  }
}

async function verify() {
  if (code.value.length !== 6 || confirmBusy.value) return
  confirmBusy.value = true
  confirmError.value = ''
  try {
    await api.notifications.verify(code.value)
    codeSent.value = false
    await load()
  }
  catch (e) {
    confirmError.value = apiError(e)
    // a wrong code: the field is cleared and ready for the next try
    code.value = ''
    nextTick(() => document.querySelector<HTMLInputElement>('.code input')?.focus())
  }
  finally {
    confirmBusy.value = false
  }
}

// all six digits typed: check right away, no need to press the button
watch(code, value => value.length === 6 && verify())
const digitsOnly = (text: string) => text.replace(/\D/g, '').slice(0, 6)

async function save() {
  const days = Number(form.days)
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) error.value = 'Введите почту'
  else if (!Number.isInteger(days) || days < 0 || days > 365) error.value = 'Дней до срока: от 0 до 365'
  else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)) error.value = 'Время в формате ЧЧ:ММ'
  else {
    error.value = ''
    busy.value = true
    const body = { email: form.email.trim(), email_enabled: form.enabled, days_before_due: days, send_time: form.time, timezone: form.timezone }
    try {
      // first time: create, after that: replace
      if (saved.value) await api.notifications.replace(body)
      else await api.notifications.create(body)
      await load()
      codeSent.value = false
      done.value = true
      setTimeout(() => (done.value = false), 2500)
    }
    catch (e) {
      error.value = apiError(e)
    }
    finally {
      busy.value = false
    }
  }
}
</script>

<template>
  <div class="notify">
    <UiState v-if="loadError" kind="error" @retry="load">Не удалось загрузить: {{ loadError }}</UiState>

    <!-- grey rows of the same size until the settings arrive, so nothing jumps -->
    <template v-else-if="saved === undefined">
      <div v-for="control in skeletonControls" :key="control" class="row">
        <span class="stack"><UiSkeleton width="170px" height="14px" /><UiSkeleton width="230px" height="10px" /></span>
        <UiSkeleton v-if="control === 'switch'" width="28px" height="16px" />
        <span v-else class="field" :class="{ wide: control === 'wide' }"><UiSkeleton height="40px" /></span>
      </div>
      <div class="row">
        <span />
        <UiSkeleton width="170px" height="36px" />
      </div>
    </template>

    <!-- one setting per row, like the other sections: what it is on the left, the field on the right -->
    <template v-else>
      <div class="row">
        <div>
          <p>Присылать письма</p>
          <p class="hint">{{ !hasEmail ? 'Сначала укажите почту' : needsConfirm && form.enabled ? 'Начнут приходить, когда вы подтвердите почту' : 'О платежах, за которые вы отвечаете' }}</p>
        </div>
        <UiSwitch v-model="form.enabled" :disabled="!hasEmail" aria-label="Присылать письма" />
      </div>

      <div class="row">
        <div>
          <p>Почта</p>
          <p v-if="saved?.email" class="hint" :class="saved.email_verified ? 'ok' : 'off'">
            {{ saved.email_verified ? 'Подтверждена' : 'Не подтверждена' }}
          </p>
          <p v-else class="hint">Смена почты снимает подтверждение</p>
        </div>
        <span class="field wide"><UiInput v-model="form.email" type="email" placeholder="name@company.ru" autocomplete="email" aria-label="Почта" /></span>
      </div>

      <!-- letters only go to a confirmed address -->
      <div v-if="needsConfirm" class="row confirm">
        <div>
          <p>Подтвердите почту</p>
          <p v-if="confirmError" class="hint error-text">{{ confirmError }}</p>
          <p v-else-if="changedEmail" class="hint">Сначала сохраните новую почту</p>
          <p v-else-if="codeSent" class="hint">Код отправлен на {{ saved?.email }}</p>
          <p v-else class="hint">Письма приходят только на подтверждённую почту</p>
        </div>
        <span class="actions">
          <template v-if="codeSent && !changedEmail">
            <button type="button" class="again" :disabled="confirmBusy" @click="sendCode">Ещё раз</button>
            <span class="field code">
              <UiInput
                v-model="code"
                :filter="digitsOnly"
                mono
                inputmode="numeric"
                autocomplete="one-time-code"
                placeholder="000000"
                maxlength="6"
                aria-label="Код из письма"
                @keydown.enter="verify"
              />
            </span>
            <UiButton size="md" variant="primary" :disabled="confirmBusy || code.length !== 6" @click="verify">
              {{ confirmBusy ? 'Проверяем…' : 'Подтвердить' }}
            </UiButton>
          </template>
          <UiButton v-else size="md" :disabled="confirmBusy || changedEmail" @click="sendCode">
            {{ confirmBusy ? 'Отправляем…' : 'Отправить код' }}
          </UiButton>
        </span>
      </div>

      <div class="row">
        <div>
          <p>За сколько дней до срока</p>
          <p class="hint">От 0 до 365</p>
        </div>
        <span class="field"><UiInput v-model="form.days" mono inputmode="numeric" maxlength="3" aria-label="За сколько дней до срока" /></span>
      </div>

      <div class="row">
        <div>
          <p>Во сколько</p>
          <p class="hint">Часовой пояс: {{ form.timezone }}</p>
        </div>
        <span class="field"><UiInput v-model="form.time" mono placeholder="09:00" maxlength="5" aria-label="Во сколько" /></span>
      </div>

      <div class="row">
        <p v-if="error" class="error-text">{{ error }}</p>
        <p v-else-if="done" class="hint ok">Сохранено</p>
        <span v-else />
        <UiButton size="md" variant="primary" :disabled="busy" @click="save">
          {{ saved ? 'Сохранить' : 'Включить напоминания' }}
        </UiButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* same rows as the other settings sections: hairlines, no box */
.notify {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--line);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 10px 44px 10px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 14px;
}

.field {
  flex-shrink: 0;
  width: 120px;
}

.field.wide {
  width: 320px;
}

.actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
}

/* six digits, spaced a little so they read like a code */
.code :deep(input) {
  letter-spacing: 0.2em;
  text-align: center;
}

.again {
  padding: 0;
  background: none;
  border: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-ink);
}

.again:disabled {
  opacity: 0.5;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-3);
}

.ok {
  color: var(--green);
}

.hint.error-text {
  color: var(--red);
}

.off {
  color: var(--amber);
}
</style>
