<!-- app/components/integration/WhatsAppModal.vue -->
<script setup lang="ts">
import { useChannelStore } from "../../stores/channel"

// ─── Props & emits (v-model:open pattern for UModal in Nuxt UI v4) ────────────
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void
}>()

// Bridge parent v-model → UModal's v-model:open
const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit("update:modelValue", val),
})

// ─── Store & toast ────────────────────────────────────────────────────────────
const channelStore = useChannelStore()
const toast = useToast()

// ─── Form state ───────────────────────────────────────────────────────────────
const phoneId = ref<string>("")
const accountId = ref("")
const accessToken = ref("")

// ─── Validation errors ────────────────────────────────────────────────────────
const errors = ref({
  phoneId: "",
  accountId: "",
  accessToken: "",
})

const validateForm = (): boolean => {
  errors.value.phoneId = phoneId.value.trim()
    ? ""
    : "Phone Number ID is required"
  errors.value.accountId = accountId.value.trim()
    ? ""
    : "WhatsApp Business Account ID is required"
  errors.value.accessToken = accessToken.value.trim()
    ? ""
    : "Permanent Access Token is required"

  return !errors.value.phoneId && !errors.value.accountId && !errors.value.accessToken
}

const resetForm = () => {
  phoneId.value = ""
  accountId.value = ""
  accessToken.value = ""
  errors.value = { phoneId: "", accountId: "", accessToken: "" }
}

// ─── Submit handler ───────────────────────────────────────────────────────────
const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    await channelStore.connectWhatsApp({
      phoneId: phoneId.value.trim(),
      accountId: accountId.value.trim(),
      accessToken: accessToken.value.trim(),
    })

    toast.add({
      title: "WhatsApp Connected",
      description: "Your WhatsApp Business API was linked successfully.",
      color: "success",
      icon: "i-lucide-circle-check",
    })

    isOpen.value = false
    resetForm()
  } catch (err) {
    console.error("WhatsApp connection failed:", err)
    toast.add({
      title: "Connection Failed",
      description: "Please check your credentials and try again.",
      color: "error",
      icon: "i-lucide-circle-x",
    })
  }
}

// Reset form whenever modal closes so stale data never leaks in on re-open
watch(isOpen, (open) => {
  if (!open) resetForm()
})
</script>

<template>
  <!--
    NUXT UI v4: UModal uses v-model:open (NOT v-model).
    Content is structured via named slots: #header, #body, #footer.
  -->
  <UModal
    v-model:open="isOpen"
    :ui="{
      content: 'bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-0',
      header: 'border-b border-neutral-800/50 px-6 pt-6 pb-4',
      body: 'px-6 py-5',
      footer: 'border-t border-neutral-800/50 px-6 pb-6 pt-4'
    }"
  >
    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <template #header>
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shrink-0">
          <UIcon
            name="i-lucide-phone"
            class="size-5 text-emerald-400"
          />
        </div>
        <div>
          <p class="text-base font-bold text-white leading-tight">
            Connect WhatsApp Business
          </p>
          <p class="text-xs text-neutral-400 mt-0.5">
            Paste your credentials from the WhatsApp Cloud API portal.
          </p>
        </div>
      </div>
    </template>

    <!-- ── Body ───────────────────────────────────────────────────────────── -->
    <template #body>
      <form
        id="whatsapp-connect-form"
        class="space-y-5"
        @submit.prevent="handleSubmit"
      >
        <!-- Phone Number ID -->
        <UFormField
          label="Phone Number ID"
          :error="errors.phoneId"
          required
        >
          <UInput
            v-model="phoneId"
            placeholder="e.g., 102384759201"
            color="neutral"
            variant="subtle"
            size="lg"
            :disabled="channelStore.isLoading"
            class="w-full"
            :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
          />
        </UFormField>

        <!-- WhatsApp Business Account ID -->
        <UFormField
          label="WhatsApp Business Account ID"
          :error="errors.accountId"
          required
        >
          <UInput
            v-model="accountId"
            placeholder="e.g., 901284759201"
            color="neutral"
            variant="subtle"
            size="lg"
            :disabled="channelStore.isLoading"
            class="w-full"
            :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
          />
        </UFormField>

        <!-- Permanent Access Token -->
        <UFormField
          label="Permanent Access Token"
          :error="errors.accessToken"
          required
        >
          <UInput
            v-model="accessToken"
            placeholder="e.g., EAAG..."
            type="password"
            color="neutral"
            variant="subtle"
            size="lg"
            :disabled="channelStore.isLoading"
            class="w-full"
            :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
          />
        </UFormField>
      </form>
    </template>

    <!-- ── Footer ─────────────────────────────────────────────────────────── -->
    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="lg"
          :disabled="channelStore.isLoading"
          class="rounded-xl font-semibold"
          @click="isOpen = false"
        >
          Cancel
        </UButton>

        <UButton
          type="submit"
          form="whatsapp-connect-form"
          color="success"
          variant="solid"
          size="lg"
          icon="i-lucide-plug"
          :loading="channelStore.isLoading"
          :disabled="channelStore.isLoading"
          class="rounded-xl font-bold"
        >
          Connect WhatsApp
        </UButton>
      </div>
    </template>
  </UModal>
</template>
