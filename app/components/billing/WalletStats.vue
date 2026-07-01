<!-- app/components/billing/WalletStats.vue -->
<script setup lang="ts">
import { useAuthStore } from "~/stores/auth"

const authStore = useAuthStore()

const stats = computed(() => [
  {
    label: "Wallet Balance",
    value: authStore.formattedWalletBalance,
    icon: "i-lucide-wallet",
    help: "Current BDT deposit balance"
  },
  {
    label: "Available Credits",
    value: `${authStore.totalCredits} Credits`,
    icon: "i-lucide-zap",
    help: "AI message credits remaining"
  },
  {
    label: "Daily Message Quota",
    value: `${authStore.dailyQuotaLimit} / day`,
    icon: "i-lucide-circle-check",
    help: "Maximum messages per day"
  }
])
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
    <div
      v-for="stat in stats"
      :key="stat.label"
      class="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-xl flex items-center gap-4 hover:border-neutral-700 transition-colors duration-200"
    >
      <!-- Icon pill -->
      <div class="shrink-0 p-3 bg-neutral-950 border border-neutral-800 rounded-2xl">
        <UIcon
          :name="stat.icon"
          class="w-6 h-6 text-primary"
        />
      </div>

      <!-- Label + value -->
      <div class="min-w-0">
        <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider">
          {{ stat.label }}
        </p>
        <p class="text-lg font-bold text-white mt-0.5 tabular-nums truncate">
          {{ stat.value }}
        </p>
        <p class="text-[11px] text-neutral-600 mt-0.5">
          {{ stat.help }}
        </p>
      </div>
    </div>
  </div>
</template>
