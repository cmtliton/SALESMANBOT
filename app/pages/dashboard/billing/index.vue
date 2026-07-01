<!-- app/pages/dashboard/billing/index.vue -->
<script setup lang="ts">
import { useBillingStore } from "~/stores/billing"

definePageMeta({ layout: "dashboard" })

const billingStore = useBillingStore()

onMounted(() => billingStore.fetchBillingData())
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="pb-4 border-b border-neutral-900 space-y-1">
      <h1 class="text-3xl font-black text-white tracking-tight">
        Wallet & Billing
      </h1>
      <p class="text-neutral-400 text-sm">
        Top up your wallet balance, track your credit usage, and manage system limits.
      </p>
    </div>

    <!-- Wallet stats cards -->
    <BillingWalletStats />

    <!-- Deposit form (left) + history table (right) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <BillingDepositForm />
      <BillingDepositHistory />
    </div>
  </div>
</template>
