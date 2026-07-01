<!-- app/components/settings/ModelConfigCard.vue -->

<script setup lang="ts">
import type { AISettings } from "../../../prisma/generated/client"

import { computed, ref } from "vue"

const form = defineModel<AISettings>("form", { required: true })

// Bridge for v-model: UInput expects string | undefined but stored value may be string | null
const customApiKeyProxy = computed<string | undefined>({
  get: () => (form.value.customApiKey ?? undefined),
  set: (val: string | undefined) => {
    form.value.customApiKey = val ?? null
  },
})

// API key visibility toggle
const showApiKey = ref(false)

// USelect in Nuxt UI v4 uses `items`, NOT `options`
const providerItems = [
  { label: "SalesmanChatbot 2.0 (Ollama)", value: "OLLAMA" },
  { label: "OpenAI (GPT-4)", value: "OPENAI" },
  { label: "Anthropic (Claude)", value: "CLAUDE" },
  { label: "Google Gemini", value: "GEMINI" },
  { label: "Mistral Cloud", value: "MISTRAL" },
  { label: "OpenRouter (Recommended)", value: "OPENROUTER" },
  { label: "Groq (Super Fast)", value: "GROQ" },
  { label: "Custom Provider", value: "CUSTOM" },
]
</script>

<template>
  <div class="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-5 shadow-xl">
    <!-- Card header -->
    <div class="flex items-center gap-2.5 pb-4 border-b border-neutral-800/50">
      <div class="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shrink-0">
        <UIcon
          name="i-lucide-cpu"
          class="size-5 text-emerald-400"
        />
      </div>
      <div>
        <p class="text-sm font-bold text-white leading-tight">
          Model & Credentials
        </p>
        <p class="text-xs text-neutral-400 mt-0.5">
          Configure your primary LLM brain and API endpoints.
        </p>
      </div>
    </div>

    <!-- Provider + Model Name — 2-column grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- AI Provider select -->
      <UFormField label="AI Provider">
        <USelect
          v-model="form.provider"
          :items="providerItems"
          color="neutral"
          variant="subtle"
          size="lg"
          class="w-full"
          :ui="{
            base: 'bg-neutral-800/60 text-neutral-100',
            content: 'bg-neutral-900 border border-neutral-800',
            item: 'text-neutral-200 data-highlighted:bg-neutral-800'
          }"
        />
      </UFormField>

      <!-- Model Name input -->
      <UFormField label="Model Name">
        <UInput
          v-model="form.modelName"
          placeholder="e.g., llama3.2, gpt-4o-mini"
          color="neutral"
          variant="subtle"
          size="lg"
          class="w-full"
          :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
        />
      </UFormField>
    </div>

    <!-- Custom API Key — full width with visibility toggle -->
    <UFormField label="Custom API Key">
      <UInput
        v-model="customApiKeyProxy"
        :type="showApiKey ? 'text' : 'password'"
        placeholder="Enter your API key, or leave blank for platform defaults"
        color="neutral"
        variant="subtle"
        size="lg"
        class="w-full"
        :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
      >
        <template #trailing>
          <UButton
            :icon="showApiKey ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="showApiKey ? 'Hide API key' : 'Show API key'"
            @click="showApiKey = !showApiKey"
          />
        </template>
      </UInput>
      <!-- Helper text -->
      <template #help>
        Leave blank to use platform default credits. Providing a custom key routes
        requests directly to your own quota.
      </template>
    </UFormField>
  </div>
</template>
