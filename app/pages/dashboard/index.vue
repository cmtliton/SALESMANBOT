<!-- app/pages/dashboard/index.vue -->
<script setup lang="ts">
import { useAuthStore } from "~/stores/auth"

definePageMeta({ layout: "dashboard" })

const authStore = useAuthStore()

const userName = computed(() => authStore.user?.name ?? "Commander")
const workspaceName = computed(() => authStore.organization?.name ?? "Workspace Setup Pending")

// Stats cards config — easy to extend or make dynamic later
const stats = computed(() => [
  {
    label: "Active Workspace",
    value: workspaceName.value,
    icon: "i-lucide-building-2",
    truncate: true
  },
  {
    label: "Credits Available",
    value: `${authStore.totalCredits} Credits`,
    icon: "i-lucide-zap",
    truncate: false
  },
  {
    label: "Wallet Balance",
    value: authStore.formattedWalletBalance,
    icon: "i-lucide-wallet",
    truncate: false
  },
  {
    label: "Automation Rate",
    value: "80% Operational",
    icon: "i-lucide-circle-check",
    truncate: false
  }
])
useHead({
  title: "Dashboard Overview"
})
</script>

<template>
  <div class="space-y-6">
    <!-- ── Welcome Banner ── -->
    <div class="relative overflow-hidden bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl">
      <!-- Decorative glow blobs -->
      <div class="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div class="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

      <div class="relative space-y-3">
        <!-- Status badge -->
        <div class="inline-flex items-center gap-1.5">
          <span class="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span class="text-xs font-semibold text-primary uppercase tracking-widest">
            AI Control Room Active
          </span>
        </div>

        <h1 class="text-2xl md:text-3xl font-black text-white leading-tight">
          Welcome back, <span class="text-primary">{{ userName }}</span>! 👋
        </h1>

        <p class="text-neutral-400 text-sm max-w-2xl leading-relaxed">
          Your AI-powered sales agents are operational. Automated pipelines are
          actively listening, answering FAQs, and taking orders across all
          connected platforms.
        </p>
      </div>
    </div>

    <!-- ── Stats Grid ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center gap-4 hover:border-neutral-700 transition-colors duration-200"
      >
        <!-- Icon pill -->
        <div class="shrink-0 p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
          <UIcon
            :name="stat.icon"
            class="w-5 h-5 text-primary"
          />
        </div>

        <!-- Label + value -->
        <div class="min-w-0 flex-1">
          <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-0.5">
            {{ stat.label }}
          </p>
          <p
            class="text-base font-bold text-white"
            :class="stat.truncate ? 'truncate' : ''"
          >
            {{ stat.value }}
          </p>
        </div>
      </div>
    </div>

    <!-- ── Quick Actions ── -->
    <div class="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-rocket"
          class="w-4 h-4 text-primary"
        />
        <h2 class="text-sm font-bold text-neutral-200 uppercase tracking-wider">
          Quick Actions
        </h2>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <UButton
          to="/dashboard/agents"
          variant="soft"
          color="primary"
          leading-icon="i-lucide-bot"
          block
        >
          Manage Agents
        </UButton>
        <UButton
          to="/dashboard/campaigns"
          variant="soft"
          color="neutral"
          leading-icon="i-lucide-megaphone"
          block
        >
          Campaigns
        </UButton>
        <UButton
          to="/dashboard/contacts"
          variant="soft"
          color="neutral"
          leading-icon="i-lucide-users"
          block
        >
          Contacts
        </UButton>
        <UButton
          to="/dashboard/billing"
          variant="soft"
          color="neutral"
          leading-icon="i-lucide-credit-card"
          block
        >
          Top Up Wallet
        </UButton>
      </div>
    </div>
  </div>
</template>
