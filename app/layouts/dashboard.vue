<!-- app/layouts/dashboard.vue -->
<script setup lang="ts">
import { useAuthStore } from "~/stores/auth"

const authStore = useAuthStore()
const supabaseUser = useSupabaseUser()
const isSidebarOpen = ref(false)

// callOnce ensures fetchUserStatus runs exactly once per app lifecycle,
// even if the layout re-mounts, preventing redundant API calls.
await callOnce(async () => {
  if (supabaseUser.value) {
    await authStore.fetchUserStatus()
  }
})
</script>

<template>
  <div class="min-h-screen bg-neutral-950 text-neutral-100 flex">
    <!-- Sidebar handles both desktop fixed aside and mobile USlideover -->
    <DashboardSidebar
      :is-open="isSidebarOpen"
      @close="isSidebarOpen = false"
    />

    <!-- Main content area — offset by sidebar width on desktop -->
    <div class="flex-1 flex flex-col md:pl-64 min-h-screen">
      <DashboardNavbar @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

      <main class="flex-1 overflow-y-auto p-4 md:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
