<!-- app/pages/onboarding.vue -->
<script setup lang="ts">
import { z } from "zod"
import type { FormSubmitEvent } from "#ui/types"

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const toast = useToast()

const user = useSupabaseUser()

// Read first name from metadata, fall back to email prefix, then 'there'
const displayName = computed(() => {
  const full = user.value?.user_metadata?.full_name as string | undefined
  if (full) return full.split(" ")[0]
  if (user.value?.email) return user.value.email.split("@")[0]
  return "there"
})

const state = reactive({ businessName: "" })
const isLoading = ref(false)

// ── Zod schema ──
const schema = z.object({
  businessName: z
    .string()
    .min(1, "Workspace name is required")
    .min(2, "Workspace name must be at least 2 characters")
    .max(60, "Workspace name must be under 60 characters")
})

type OnboardingSchema = z.output<typeof schema>

// ── Submit handler ──
async function handleOnboarding(event: FormSubmitEvent<OnboardingSchema>) {
  isLoading.value = true
  try {
    await $fetch("/api/auth/onboarding", {
      method: "POST",
      body: { businessName: event.data.businessName }
    })

    toast.add({
      title: "Workspace created!",
      description: `"${event.data.businessName}" is ready. Let's get started.`,
      color: "success",
      icon: "i-lucide-circle-check"
    })

    await navigateTo("/dashboard", { replace: true })
  } catch (err: unknown) {
    // $fetch throws FetchError — server message lives in err.data?.message
    const message
      = (err as { data?: { message?: string } })?.data?.message
        ?? (err instanceof Error ? err.message : "Failed to create workspace. Please try again.")

    toast.add({
      title: "Setup Failed",
      description: message,
      color: "error",
      icon: "i-lucide-circle-x"
    })
  } finally {
    isLoading.value = false
  }
}

// ── Sign out ──
async function handleSignOut() {
  await supabase.auth.signOut()
  await navigateTo("/login", { replace: true })
}
</script>

<template>
  <div class="min-h-screen bg-neutral-950 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-lg">
      <div class="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 md:p-10 shadow-2xl space-y-8">
        <!-- ── Header ── -->
        <div class="space-y-3">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
            <UIcon
              name="i-lucide-building-2"
              class="w-6 h-6 text-primary"
            />
          </div>
          <div class="space-y-1.5">
            <h1 class="text-3xl font-extrabold tracking-tight text-white">
              Welcome, <span class="text-primary">{{ displayName }}</span>! 👋
            </h1>
            <p class="text-neutral-400 text-sm leading-relaxed">
              Let's set up your workspace. It acts as your isolated environment
              where you can connect social channels, sync inventory, and let your
              AI sales agents operate.
            </p>
          </div>
        </div>

        <!-- ── Step indicator ── -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-xs font-semibold text-primary">
            <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">
              1
            </span>
            Create Workspace
          </div>
          <div class="flex-1 h-px bg-neutral-800" />
          <div class="flex items-center gap-2 text-xs font-medium text-neutral-600">
            <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-neutral-800 text-neutral-500 text-[10px] font-bold">
              2
            </span>
            Dashboard
          </div>
        </div>

        <!-- ── Form ── -->
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-2"
          @submit="handleOnboarding"
        >
          <UFormField
            name="businessName"
            label="Workspace / Business Name"
            required
            size="lg"
            help="This is your organization name. You can invite team members and rename it anytime from Settings."
          >
            <UInput
              v-model="state.businessName"
              placeholder="e.g., My Gadget Shop"
              leading-icon="i-lucide-briefcase"
              size="lg"
              class="w-full"
              :ui="{
                base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
              }"
            />
          </UFormField>

          <!-- Character counter -->
          <div class="flex justify-end">
            <span
              class="text-xs tabular-nums transition-colors"
              :class="state.businessName.length > 50 ? 'text-warning' : 'text-neutral-600'"
            >
              {{ state.businessName.length }} / 60
            </span>
          </div>

          <div class="pt-2">
            <UButton
              type="submit"
              block
              size="lg"
              :loading="isLoading"
              :disabled="isLoading"
              trailing-icon="i-lucide-arrow-right"
            >
              {{ isLoading ? 'Initializing Workspace...' : 'Create Workspace & Continue' }}
            </UButton>
          </div>
        </UForm>

        <!-- ── Footer ── -->
        <div class="border-t border-neutral-800 pt-5 flex items-center justify-between">
          <p class="text-xs text-neutral-600">
            Signed in as
            <span class="text-neutral-400 font-medium">{{ user?.email }}</span>
          </p>
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            leading-icon="i-lucide-log-out"
            @click="handleSignOut"
          >
            Sign Out
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
