<!-- app/pages/dashboard/settings/ai.vue -->
<script setup lang="ts">
import { useChannelStore } from "../../../stores/channel"
import { useAISettingsStore } from "../../../stores/aiSettings"
import type { AISettings } from "../../../../prisma/generated/client"

// ─── Page meta ────────────────────────────────────────────────────────────────
definePageMeta({ layout: "dashboard" })

// ─── Stores & utilities ───────────────────────────────────────────────────────
const channelStore = useChannelStore()
const aiSettingsStore = useAISettingsStore()
const toast = useToast()

// ─── Form state — initialized with safe defaults so child components never
//     receive `undefined` (their defineModel is required: true) ───────────────
const form = ref<AISettings>({
  id: "",
  channelId: "",
  provider: "OPENAI",
  modelName: "",
  customApiKey: null,
  systemPrompt: "",
  imagePrompt: null,
  smartReplyDelay: 0,
  memoryContextLimit: 0,
  creativity: 0,
  diversity: 0,
  semanticCacheEnabled: false,
  semanticCacheThreshold: 0,
  embeddingEnabled: false,
  proPlusMode: false,
  orderEmailNotifications: false,
  notificationEmail: null,
})

// ─── Channel selector ─────────────────────────────────────────────────────────
const selectedChannelId = ref<string | undefined>()

// Fetch channels on mount
onMounted(async () => {
  await channelStore.fetchChannels()
})

// Map active channels to USelect items (Nuxt UI v4 uses `items`, not `options`)
const channelItems = computed(() =>
  channelStore.channels
    .filter(c => c.status === "ACTIVE")
    .map(c => ({
      label: `${c.platform === "WHATSAPP" ? "WhatsApp" : "Messenger"} · ID: ${c.id}`,
      value: c.id,
    }))
)

// ─── Fetch settings when channel selection changes ────────────────────────────
watch(selectedChannelId, async (id) => {
  if (id) {
    await aiSettingsStore.fetchSettings(id)
  } else {
    aiSettingsStore.activeSettings = null
  }
})

// ─── Map store → local form whenever activeSettings updates ──────────────────
watch(
  () => aiSettingsStore.activeSettings,
  (s) => {
    if (!s) return
    form.value = {
      id: s.id,
      channelId: s.channelId,
      provider: s.provider,
      modelName: s.modelName,
      customApiKey: s.customApiKey ?? null,
      systemPrompt: s.systemPrompt,
      imagePrompt: s.imagePrompt ?? null,
      smartReplyDelay: s.smartReplyDelay,
      memoryContextLimit: s.memoryContextLimit,
      creativity: s.creativity,
      diversity: s.diversity,
      semanticCacheEnabled: s.semanticCacheEnabled,
      semanticCacheThreshold: s.semanticCacheThreshold,
      embeddingEnabled: s.embeddingEnabled,
      proPlusMode: s.proPlusMode,
      orderEmailNotifications: s.orderEmailNotifications,
      notificationEmail: s.notificationEmail ?? null,
    }
  },
  { deep: true }
)

// ─── Save handler ─────────────────────────────────────────────────────────────
const saveSettings = async () => {
  if (!selectedChannelId.value) return

  try {
    await aiSettingsStore.updateSettings(selectedChannelId.value, form.value)
    toast.add({
      title: "Settings Saved",
      description: "AI configurations updated and synced with active agents.",
      color: "success",
      icon: "i-lucide-circle-check",
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Failed to save AI configurations:", err)
    toast.add({
      title: "Save Failed",
      description: err?.message ?? "Something went wrong. Please try again.",
      color: "error",
      icon: "i-lucide-circle-x",
    })
  }
}
</script>

<template>
  <!-- pb-28 reserves space so the sticky save bar never overlaps content -->
  <div class="space-y-6 pb-28">
    <!-- Page header + channel selector -->
    <div class="pb-5 border-b border-neutral-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-white tracking-tight">
          AI Configurations
        </h1>
        <p class="mt-1 text-sm text-neutral-400 max-w-xl">
          Configure system prompts, RAG parameters, and model triggers per connected channel.
        </p>
      </div>

      <!-- Channel selector — USelect uses :items in Nuxt UI v4 -->
      <div class="w-full md:w-80 space-y-1.5">
        <p class="text-xs font-semibold text-neutral-400">
          Select Connected Channel
        </p>
        <USelect
          v-model="selectedChannelId"
          :items="channelItems"
          placeholder="Choose a connected channel…"
          color="neutral"
          variant="subtle"
          size="lg"
          class="w-full"
          :ui="{ base: 'bg-neutral-800/60 text-neutral-100' }"
        />
      </div>
    </div>

    <!-- Empty state — no channel selected -->
    <div
      v-if="!selectedChannelId"
      class="flex flex-col items-center justify-center py-20 bg-neutral-900 border border-neutral-800 rounded-3xl text-center space-y-4 shadow-xl"
    >
      <div class="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl text-neutral-600">
        <UIcon
          name="i-lucide-sliders-horizontal"
          class="size-9"
        />
      </div>
      <div class="space-y-1.5 max-w-sm">
        <p class="text-lg font-bold text-white">
          Select a channel to configure
        </p>
        <p class="text-sm text-neutral-400 leading-relaxed">
          Choose a connected Facebook Page or WhatsApp number above to adjust
          its AI settings.
        </p>
      </div>
    </div>

    <!-- Config cards — only shown when a channel is selected -->
    <template v-else>
      <!-- Row 1: Model + Prompts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <SettingsModelConfigCard v-model:form="form" />
        <SettingsPromptsConfigCard v-model:form="form" />
      </div>

      <!-- Row 2: Parameters + Feature toggles -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <SettingsParametersConfigCard v-model:form="form" />
        <SettingsFeatureTogglesCard v-model:form="form" />
      </div>
    </template>

    <!-- Sticky save bar — only shown when a channel is selected -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="selectedChannelId"
        class="fixed bottom-0 left-0 md:left-64 right-0 z-40 h-20 flex items-center justify-end px-4 md:px-8 bg-neutral-950/80 backdrop-blur-md border-t border-neutral-800"
      >
        <div class="flex items-center gap-3">
          <UButton
            to="/dashboard"
            color="neutral"
            variant="ghost"
            size="lg"
            :disabled="aiSettingsStore.isLoading"
          >
            Cancel
          </UButton>

          <UButton
            type="button"
            color="success"
            variant="solid"
            size="lg"
            icon="i-lucide-save"
            :loading="aiSettingsStore.isLoading"
            :disabled="aiSettingsStore.isLoading"
            class="rounded-xl font-bold px-6"
            @click="saveSettings"
          >
            Save AI Configurations
          </UButton>
        </div>
      </div>
    </Transition>
  </div>
</template>
