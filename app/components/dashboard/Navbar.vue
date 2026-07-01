<!-- app/components/dashboard/Navbar.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui"
import { useAuthStore } from "~/stores/auth"

defineEmits<{
  "toggle-sidebar": []
}>()

const supabase = useSupabaseClient()
const authStore = useAuthStore()
const toast = useToast()

// ── Derived display values ──
const userInitial = computed(() => {
  const name = authStore.user?.name || authStore.user?.email || "U"
  return name.charAt(0).toUpperCase()
})

const userEmail = computed(() => authStore.user?.email ?? "")
const workspaceName = computed(() => authStore.organization?.name ?? "My Workspace")

// ── Logout handler ──
async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    authStore.clearSession()

    toast.add({
      title: "Logged Out",
      description: "You have been successfully logged out.",
      color: "success",
      icon: "i-lucide-circle-check"
    })

    await navigateTo("/login")
  } catch (err: unknown) {
    toast.add({
      title: "Logout Failed",
      description: err instanceof Error ? err.message : "Something went wrong.",
      color: "error",
      icon: "i-lucide-circle-x"
    })
  }
}

// ── UDropdownMenu items ──
// Groups are defined as arrays of arrays — each inner array becomes a separated section.
// 'type: label' renders the first item as a non-interactive header.
// 'onSelect' is the v4 API (replaces 'click').
// 'color: error' highlights the logout item in red.
const dropdownItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: userEmail.value,
      type: "label" as const,
      avatar: {
        text: userInitial.value,
        color: "primary" as const
      }
    }
  ],
  [
    {
      label: "Profile & Team",
      icon: "i-lucide-user",
      to: "/dashboard/profile"
    },
    {
      label: "Billing & Wallet",
      icon: "i-lucide-credit-card",
      to: "/dashboard/billing"
    }
  ],
  [
    {
      label: "Log Out",
      icon: "i-lucide-log-out",
      color: "error" as const,
      onSelect: handleLogout
    }
  ]
])
</script>

<template>
  <header class="bg-neutral-900 border-b border-neutral-800 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
    <!-- ── Left: mobile hamburger + workspace name ── -->
    <div class="flex items-center gap-3">
      <UButton
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Toggle sidebar"
        class="md:hidden"
        @click="$emit('toggle-sidebar')"
      />

      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-building-2"
          class="w-4 h-4 text-neutral-500 hidden sm:block"
        />
        <span class="text-sm text-neutral-500 font-medium hidden sm:block">Workspace:</span>
        <span class="text-sm text-neutral-100 font-bold tracking-wide truncate max-w-35">
          {{ workspaceName }}
        </span>
      </div>
    </div>

    <!-- ── Center: wallet + credits pill ── -->
    <NuxtLink
      to="/dashboard/billing"
      class="hidden sm:flex items-center gap-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 px-4 py-1.5 rounded-full transition-colors duration-200"
    >
      <div class="flex items-center gap-1.5 text-xs">
        <UIcon
          name="i-lucide-wallet"
          class="w-3.5 h-3.5 text-neutral-500"
        />
        <span class="text-neutral-500">Wallet:</span>
        <span class="text-primary font-bold tabular-nums">
          {{ authStore.formattedWalletBalance }}
        </span>
      </div>
      <span class="text-neutral-700">|</span>
      <div class="flex items-center gap-1.5 text-xs">
        <UIcon
          name="i-lucide-zap"
          class="w-3.5 h-3.5 text-neutral-500"
        />
        <span class="text-neutral-500">Credits:</span>
        <span class="text-primary font-bold tabular-nums">
          {{ authStore.totalCredits }}
        </span>
      </div>
    </NuxtLink>

    <!-- ── Right: profile dropdown ── -->
    <UDropdownMenu
      :items="dropdownItems"
      :content="{ align: 'end', sideOffset: 8 }"
      :ui="{ content: 'w-56' }"
    >
      <!-- Trigger: UAvatar with the user's initial as fallback text -->
      <UAvatar
        :text="userInitial"
        :src="authStore.user?.avatarUrl ?? undefined"
        :alt="authStore.user?.name ?? 'User'"
        color="primary"
        size="sm"
        class="cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all duration-200"
      />
    </UDropdownMenu>
  </header>
</template>
