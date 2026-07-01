<!-- app/components/integration/ChannelCard.vue -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    icon: string
    iconColor: string
    isConnected: boolean
    detailsText: string
    isComingSoon?: boolean
    buttonText: string
  }>(),
  {
    isComingSoon: false,
  }
)

const emit = defineEmits<{
  (e: "connect" | "disconnect"): void
}>()
</script>

<template>
  <div
    class="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between min-h-70 transition-opacity duration-200"
    :class="{ 'opacity-50': isComingSoon }"
  >
    <div class="space-y-4">
      <!-- Top row: platform icon + status badge -->
      <div class="flex items-center justify-between">
        <!-- Platform icon container — bg/border on wrapper, color on UIcon -->
        <div class="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 shrink-0">
          <UIcon
            :name="icon"
            class="size-6"
            :class="iconColor"
          />
        </div>

        <!-- Status badge -->
        <UBadge
          v-if="isComingSoon"
          label="Coming Soon"
          color="neutral"
          variant="subtle"
          size="sm"
        />
        <UBadge
          v-else-if="isConnected"
          label="Connected"
          color="success"
          variant="subtle"
          size="sm"
          icon="i-lucide-circle-check"
        />
        <UBadge
          v-else
          label="Not Connected"
          color="neutral"
          variant="subtle"
          size="sm"
        />
      </div>

      <!-- Title + description -->
      <div class="space-y-1.5">
        <h2 class="text-lg font-bold text-white leading-tight">
          {{ title }}
        </h2>
        <p class="text-sm text-neutral-400 leading-relaxed">
          {{ detailsText }}
        </p>
      </div>
    </div>

    <!-- CTA button -->
    <div class="pt-5">
      <!-- Coming Soon — disabled, no emit -->
      <UButton
        v-if="isComingSoon"
        block
        disabled
        color="neutral"
        variant="subtle"
        size="lg"
        icon="i-lucide-clock"
        class="rounded-xl font-semibold"
      >
        Not Available Yet
      </UButton>

      <!-- Connected — red/error disconnect -->
      <UButton
        v-else-if="isConnected"
        block
        color="error"
        variant="outline"
        size="lg"
        icon="i-lucide-unplug"
        class="rounded-xl font-bold"
        @click="emit('disconnect')"
      >
        Disconnect Channel
      </UButton>

      <!-- Not connected — success/emerald connect -->
      <UButton
        v-else
        block
        color="success"
        variant="solid"
        size="lg"
        icon="i-lucide-plug"
        class="rounded-xl font-bold"
        @click="emit('connect')"
      >
        {{ buttonText }}
      </UButton>
    </div>
  </div>
</template>
