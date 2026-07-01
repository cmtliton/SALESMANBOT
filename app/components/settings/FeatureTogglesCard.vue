<!-- app/components/settings/FeatureTogglesCard.vue -->

<script setup lang="ts">
import type { AISettings } from "../../../prisma/generated/client"

const form = defineModel<AISettings>("form", { required: true })

// Bridge: UInput expects string|undefined, form stores string|null
const notificationEmailBinding = computed<string | undefined>({
  get: () => form.value.notificationEmail ?? undefined,
  set: (val) => { form.value.notificationEmail = val ?? null },
})
</script>

<template>
  <div class="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-6 shadow-xl">
    <!-- Card header -->
    <div class="flex items-center gap-2.5 pb-4 border-b border-neutral-800/50">
      <div class="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shrink-0">
        <UIcon
          name="i-lucide-badge-check"
          class="size-5 text-emerald-400"
        />
      </div>
      <div>
        <p class="text-sm font-bold text-white leading-tight">
          AI Features & Triggers
        </p>
        <p class="text-xs text-neutral-400 mt-0.5">
          Control automation modes, caching, and instant order alerts.
        </p>
      </div>
    </div>

    <!-- 2-column toggle grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Toggle 1: Semantic Cache -->
      <div class="flex items-start justify-between gap-4 bg-neutral-950/30 border border-neutral-800/50 p-4 rounded-2xl">
        <div class="space-y-1 min-w-0">
          <p class="text-xs font-bold text-neutral-200">
            Semantic Cache
          </p>
          <p class="text-[10px] text-neutral-500 leading-relaxed">
            Reuses previously generated responses for high-similarity queries to reduce API costs.
          </p>
        </div>
        <USwitch
          v-model="form.semanticCacheEnabled"
          color="success"
          class="shrink-0 mt-0.5"
        />
      </div>

      <!-- Toggle 2: AI Knowledge / RAG Embedding -->
      <div class="flex items-start justify-between gap-4 bg-neutral-950/30 border border-neutral-800/50 p-4 rounded-2xl">
        <div class="space-y-1 min-w-0">
          <p class="text-xs font-bold text-neutral-200">
            AI Knowledge (RAG)
          </p>
          <p class="text-[10px] text-neutral-500 leading-relaxed">
            Embeds your product catalog so the agent can answer queries with real product context.
          </p>
        </div>
        <USwitch
          v-model="form.embeddingEnabled"
          color="success"
          class="shrink-0 mt-0.5"
        />
      </div>

      <!-- Toggle 3: Pro Plus Mode -->
      <div class="flex items-start justify-between gap-4 bg-neutral-950/30 border border-neutral-800/50 p-4 rounded-2xl">
        <div class="space-y-1 min-w-0">
          <p class="text-xs font-bold text-neutral-200">
            Pro Plus Logic
          </p>
          <p class="text-[10px] text-neutral-500 leading-relaxed">
            Activates advanced LLM reasoning, visual analysis, and custom fallback capabilities.
          </p>
        </div>
        <USwitch
          v-model="form.proPlusMode"
          color="success"
          class="shrink-0 mt-0.5"
        />
      </div>

      <!-- Toggle 4: Order Email Notifications -->
      <div class="flex items-start justify-between gap-4 bg-neutral-950/30 border border-neutral-800/50 p-4 rounded-2xl">
        <div class="space-y-1 min-w-0">
          <p class="text-xs font-bold text-neutral-200">
            Order Email Alerts
          </p>
          <p class="text-[10px] text-neutral-500 leading-relaxed">
            Sends an automated email whenever the bot successfully books a pending order.
          </p>
        </div>
        <USwitch
          v-model="form.orderEmailNotifications"
          color="success"
          class="shrink-0 mt-0.5"
        />
      </div>
    </div>

    <!-- Conditional email input — revealed when orderEmailNotifications is on -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="form.orderEmailNotifications"
        class="pt-4 border-t border-neutral-800"
      >
        <UFormField
          label="Notification Email Address"
          required
        >
          <UInput
            v-model="notificationEmailBinding"
            type="email"
            placeholder="alerts@yourbusiness.com"
            icon="i-lucide-mail"
            color="neutral"
            variant="subtle"
            size="lg"
            class="w-full"
            :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
          />
          <template #help>
            The address where the sales engine pushes instant order sheets and
            payment alert data.
          </template>
        </UFormField>
      </div>
    </Transition>
  </div>
</template>
