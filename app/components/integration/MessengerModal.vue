<!-- app/components/integration/MessengerModal.vue -->
<script setup lang="ts">
import { useChannelStore } from "../../stores/channel"

// ─── Props & emits (v-model:open pattern for UModal in Nuxt UI v4) ────────────
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void
}>()

// Bridge the parent's v-model into UModal's v-model:open
const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit("update:modelValue", val)
})

// ─── Store & toast ────────────────────────────────────────────────────────────
const channelStore = useChannelStore()
const toast = useToast()

// ─── Form state ───────────────────────────────────────────────────────────────
const pageName = ref("")
const pageId = ref("")
const pageAccessToken = ref("")

// ─── Validation errors ────────────────────────────────────────────────────────
const errors = ref({
  pageName: "",
  pageId: "",
  pageAccessToken: "",
})

const validateForm = (): boolean => {
  let valid = true

  errors.value.pageName = pageName.value.trim()
    ? ""
    : "Page Name is required"
  errors.value.pageId = pageId.value.trim()
    ? ""
    : "Page ID is required"
  errors.value.pageAccessToken = pageAccessToken.value.trim()
    ? ""
    : "Page Access Token is required"

  if (errors.value.pageName || errors.value.pageId || errors.value.pageAccessToken) {
    valid = false
  }

  return valid
}

const resetForm = () => {
  pageName.value = ""
  pageId.value = ""
  pageAccessToken.value = ""
  errors.value = { pageName: "", pageId: "", pageAccessToken: "" }
}

// ─── Submit handler ───────────────────────────────────────────────────────────
const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    await channelStore.connectMessenger({
      pageName: pageName.value.trim(),
      pageId: pageId.value.trim(),
      pageAccessToken: pageAccessToken.value.trim(),
    })

    toast.add({
      title: "Messenger Connected",
      description: "Your Facebook Page was linked successfully.",
      color: "success",
      icon: "i-lucide-circle-check",
    })

    isOpen.value = false
    resetForm()
  } catch (err) {
    console.error("Messenger connection failed:", err)
    toast.add({
      title: "Connection Failed",
      description: "Please check your credentials and try again.",
      color: "error",
      icon: "i-lucide-circle-x",
    })
  }
}

// Reset form whenever the modal is closed so stale data never leaks in
watch(isOpen, (open) => {
  if (!open) resetForm()
})
</script>

<template>
  <!--
    NUXT UI v4: UModal uses v-model:open (NOT v-model).
    The prop is named `open`, bound via our computed isOpen.
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
    <!-- ── Header slot ─────────────────────────────────────────────────────── -->
    <template #header>
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 shrink-0">
          <UIcon
            name="i-lucide-facebook"
            class="size-5 text-blue-400"
          />
        </div>
        <div>
          <p class="text-base font-bold text-white leading-tight">
            Connect Facebook Messenger
          </p>
          <p class="text-xs text-neutral-400 mt-0.5">
            Paste your credentials from the Meta Developers console.
          </p>
        </div>
      </div>
    </template>

    <!-- ── Body slot ───────────────────────────────────────────────────────── -->
    <template #body>
      <form
        id="messenger-connect-form"
        class="space-y-5"
        @submit.prevent="handleSubmit"
      >
        <!-- Page Name -->
        <UFormField
          label="Page Name"
          :error="errors.pageName"
          required
        >
          <UInput
            v-model="pageName"
            placeholder="e.g., My Gadget Page"
            color="neutral"
            variant="subtle"
            size="lg"
            :disabled="channelStore.isLoading"
            class="w-full"
            :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
          />
        </UFormField>

        <!-- Page ID -->
        <UFormField
          label="Page ID"
          :error="errors.pageId"
          required
        >
          <UInput
            v-model="pageId"
            placeholder="e.g., 102384759201"
            color="neutral"
            variant="subtle"
            size="lg"
            :disabled="channelStore.isLoading"
            class="w-full"
            :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
          />
        </UFormField>

        <!-- Page Access Token -->
        <UFormField
          label="Page Access Token"
          :error="errors.pageAccessToken"
          required
        >
          <UInput
            v-model="pageAccessToken"
            placeholder="e.g., EAAxxxxxxx..."
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

    <!-- ── Footer slot ─────────────────────────────────────────────────────── -->
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
          form="messenger-connect-form"
          color="success"
          variant="solid"
          size="lg"
          icon="i-lucide-plug"
          :loading="channelStore.isLoading"
          :disabled="channelStore.isLoading"
          class="rounded-xl font-bold"
        >
          Connect Page
        </UButton>
      </div>
    </template>
  </UModal>
</template>
