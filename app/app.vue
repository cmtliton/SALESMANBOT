<!-- app/app.vue -->
<script setup lang="ts">
import { useAuthStore } from "~/stores/auth"

const authStore = useAuthStore()
const supabaseUser = useSupabaseUser()

// Watch for Supabase auth state changes (e.g. token refresh, sign out from
// another tab) and keep the Pinia store in sync automatically.
watch(
  supabaseUser,
  async (user) => {
    if (user && !authStore.isAuthenticated) {
      // User session appeared (page refresh, OAuth callback, etc.)
      await authStore.fetchUserStatus()
    } else if (!user && authStore.isAuthenticated) {
      // Session was cleared externally (sign out in another tab, token expired)
      authStore.clearSession()
    }
  },
  { immediate: false }
)
</script>

<template>
  <!-- NuxtLoadingIndicator shows a slim progress bar on route transitions -->
  <NuxtLoadingIndicator color="rgb(var(--ui-primary))" />

  <!--
    NuxtLayout renders the active layout (dashboard, default, or none).
    NuxtPage renders the matched route component inside it.
  -->
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <!-- Global toast notification portal — required by useToast() -->
  <UToaster />
</template>
