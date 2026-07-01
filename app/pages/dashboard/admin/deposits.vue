<!-- app/pages/dashboard/admin/deposits.vue -->
<script setup lang="ts">
import { useAuthStore } from "~/stores/auth"
import { useBillingStore } from "~/stores/billing"

definePageMeta({ layout: "dashboard" })

const authStore = useAuthStore()
const billingStore = useBillingStore()

const isAuthorized = computed(() =>
  authStore.user?.role === "OWNER" || authStore.user?.role === "ADMIN"
)

onMounted(() => {
  if (isAuthorized.value) billingStore.fetchAdminPending()
})
</script>

<template>
  <!-- Unauthorized -->
  <AdminAccessDenied v-if="!isAuthorized" />

  <!-- Authorized -->
  <div
    v-else
    class="space-y-6"
  >
    <div class="pb-4 border-b border-neutral-900 space-y-1">
      <h1 class="text-3xl font-black text-white tracking-tight">
        Pending Verifications
      </h1>
      <p class="text-neutral-400 text-sm">
        Verify and approve manual top-up receipts to update user wallets.
      </p>
    </div>

    <AdminPendingDepositsTable />
  </div>
</template>
