<!-- app/components/settings/PromptsConfigCard.vue -->

<script setup lang="ts">
import type { AISettings } from "../../../prisma/generated/client"

// defineModel gives us a writable ref that emits update:form automatically,
// avoiding direct prop mutation entirely.
const form = defineModel<AISettings>("form", { required: true })

// Bridge for imagePrompt: UTextarea expects string|undefined, our form uses string|null.
// null means "intentionally empty / not configured" at the API level.
const imagePromptBinding = computed<string | undefined>({
  get: () => form.value.imagePrompt ?? undefined,
  set: (val) => { form.value.imagePrompt = val ?? null },
})
</script>

<template>
  <div class="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-5 shadow-xl">
    <!-- Card header -->
    <div class="flex items-center gap-2.5 pb-4 border-b border-neutral-800/50">
      <div class="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shrink-0">
        <UIcon
          name="i-lucide-sparkles"
          class="size-5 text-emerald-400"
        />
      </div>
      <div>
        <p class="text-sm font-bold text-white leading-tight">
          System Instructions
        </p>
        <p class="text-xs text-neutral-400 mt-0.5">
          Define the AI persona, rules, and image analysis instructions.
        </p>
      </div>
    </div>

    <!-- System Prompt — 6 rows minimum -->
    <UFormField
      label="System Prompt (Sales Instructions)"
      required
    >
      <UTextarea
        v-model="form.systemPrompt"
        placeholder="Act as a helpful sales representative. Answer questions politely and recommend products based on the customer's needs..."
        :rows="6"
        color="neutral"
        variant="subtle"
        class="w-full text-sm leading-relaxed"
        :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
      />
      <template #help>
        This is the core brain of your sales bot. Outline your business values, response
        tone, and general guidelines. Retrieved RAG product context will be appended to
        this prompt automatically at inference time.
      </template>
    </UFormField>

    <!-- Image Detection Prompt — 3 rows minimum -->
    <UFormField label="Image Detection Prompt (Optional)">
      <UTextarea
        v-model="imagePromptBinding"
        placeholder="e.g., Analyze this image. If it is a product, identify its name, price, and color. If it is a payment screenshot, extract the transaction ID..."
        :rows="3"
        color="neutral"
        variant="subtle"
        class="w-full text-sm leading-relaxed"
        :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
      />
      <template #help>
        Instructions for how the Vision AI should process incoming images — product
        photos, payment receipts, or transaction screenshots.
      </template>
    </UFormField>
  </div>
</template>
