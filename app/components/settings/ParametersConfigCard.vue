<!-- app/components/settings/ParametersConfigCard.vue -->

<script setup lang="ts">
import type { AISettings } from "../../../prisma/generated/client"

// defineModel avoids direct prop mutation and emits update:form automatically
const form = defineModel<AISettings>("form", { required: true })
</script>

<template>
  <div class="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-6 shadow-xl">
    <!-- Card header -->
    <div class="flex items-center gap-2.5 pb-4 border-b border-neutral-800/50">
      <div class="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shrink-0">
        <UIcon
          name="i-lucide-sliders-horizontal"
          class="size-5 text-emerald-400"
        />
      </div>
      <div>
        <p class="text-sm font-bold text-white leading-tight">
          AI Parameters
        </p>
        <p class="text-xs text-neutral-400 mt-0.5">
          Tweak chat delays, memory context, and model creativity indexes.
        </p>
      </div>
    </div>

    <div class="space-y-7">
      <!-- 1. Smart Reply Delay (0–60s, step 1) -->
      <div class="space-y-2.5">
        <div class="flex items-baseline justify-between">
          <p class="text-xs font-semibold text-neutral-300">
            Smart Reply Delay
          </p>
          <span class="text-xs font-bold text-emerald-400 tabular-nums">
            {{ form.smartReplyDelay }}s
          </span>
        </div>
        <USlider
          v-model="form.smartReplyDelay"
          :min="0"
          :max="60"
          :step="1"
          color="success"
          size="sm"
          :tooltip="true"
        />
        <p class="text-[10px] text-neutral-500 leading-relaxed">
          Wait time (seconds) the bot spends aggregating consecutive messages before
          generating a combined response.
        </p>
      </div>

      <!-- 2. Memory Context Limit (1–50 messages, step 1) -->
      <div class="space-y-2.5">
        <div class="flex items-baseline justify-between">
          <p class="text-xs font-semibold text-neutral-300">
            Memory Context Limit
          </p>
          <span class="text-xs font-bold text-emerald-400 tabular-nums">
            {{ form.memoryContextLimit }} messages
          </span>
        </div>
        <USlider
          v-model="form.memoryContextLimit"
          :min="1"
          :max="50"
          :step="1"
          color="success"
          size="sm"
          :tooltip="true"
        />
        <p class="text-[10px] text-neutral-500 leading-relaxed">
          How many previous messages the AI retains to maintain conversational context.
        </p>
      </div>

      <!-- 3. Creativity / Temperature (0.0–1.0, step 0.05) -->
      <div class="space-y-2.5">
        <div class="flex items-baseline justify-between">
          <p class="text-xs font-semibold text-neutral-300">
            Creativity (Temperature)
          </p>
          <span class="text-xs font-bold text-emerald-400 tabular-nums">
            {{ form.creativity.toFixed(2) }}
          </span>
        </div>
        <USlider
          v-model="form.creativity"
          :min="0"
          :max="1"
          :step="0.05"
          color="success"
          size="sm"
          :tooltip="true"
        />
        <p class="text-[10px] text-neutral-500 leading-relaxed">
          Low values (e.g. 0.20) produce precise, deterministic answers. High values
          (e.g. 0.80) produce creative, human-like responses.
        </p>
      </div>

      <!-- 4. Diversity / Top P (0.0–1.0, step 0.05) -->
      <div class="space-y-2.5">
        <div class="flex items-baseline justify-between">
          <p class="text-xs font-semibold text-neutral-300">
            Diversity (Top P)
          </p>
          <span class="text-xs font-bold text-emerald-400 tabular-nums">
            {{ form.diversity.toFixed(2) }}
          </span>
        </div>
        <USlider
          v-model="form.diversity"
          :min="0"
          :max="1"
          :step="0.05"
          color="success"
          size="sm"
          :tooltip="true"
        />
        <p class="text-[10px] text-neutral-500 leading-relaxed">
          Values closer to 1.0 allow the model to sample from a wider vocabulary pool
          for richer, more varied responses.
        </p>
      </div>
    </div>
  </div>
</template>
