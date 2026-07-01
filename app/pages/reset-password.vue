<!-- app/pages/reset-password.vue -->
<script setup lang="ts">
import { z } from "zod"
import type { FormSubmitEvent } from "#ui/types"

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const toast = useToast()

// Guard: redirect away if no active session (user arrived without going through /confirm)
const user = useSupabaseUser()
onMounted(() => {
  if (!user.value) {
    navigateTo("/login", { replace: true })
  }
})

const state = reactive({
  password: "",
  confirmPassword: ""
})

const isLoading = ref(false)

// ── Zod schema with cross-field confirm password check ──
const schema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password")
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"] // attach the error to the confirmPassword field
  })

type ResetSchema = z.output<typeof schema>

async function handleResetPassword(event: FormSubmitEvent<ResetSchema>) {
  isLoading.value = true
  try {
    const { error } = await supabase.auth.updateUser({
      password: event.data.password
    })

    if (error) throw error

    toast.add({
      title: "Password Updated",
      description: "Your password has been changed. Redirecting to dashboard...",
      color: "success",
      icon: "i-lucide-circle-check"
    })

    await navigateTo("/dashboard", { replace: true })
  } catch (err: unknown) {
    toast.add({
      title: "Update Failed",
      description: err instanceof Error ? err.message : "Failed to reset password. Please try again.",
      color: "error",
      icon: "i-lucide-circle-x"
    })
  } finally {
    isLoading.value = false
  }
}
useHead({
  title: "Reset Your Password"
})
</script>

<template>
  <div class="min-h-screen bg-neutral-950 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <div class="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <!-- Header -->
        <div class="text-center space-y-1.5">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
            <UIcon
              name="i-lucide-shield-check"
              class="w-6 h-6 text-primary"
            />
          </div>
          <h1 class="text-3xl font-extrabold tracking-tight text-white">
            New Password
          </h1>
          <p class="text-neutral-400 text-sm">
            Create a strong password for your account.
          </p>
        </div>

        <!--
          z.refine() cross-field validation:
          The 'passwords do not match' error is routed to the
          confirmPassword UFormField via path: ['confirmPassword']
        -->
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="handleResetPassword"
        >
          <UFormField
            name="password"
            label="New Password"
            required
            size="lg"
          >
            <UInput
              v-model="state.password"
              type="password"
              placeholder="Min. 6 characters"
              leading-icon="i-lucide-lock"
              size="lg"
              class="w-full"
              :ui="{
                base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
              }"
            />
          </UFormField>

          <UFormField
            name="confirmPassword"
            label="Confirm Password"
            required
            size="lg"
          >
            <UInput
              v-model="state.confirmPassword"
              type="password"
              placeholder="Repeat your new password"
              leading-icon="i-lucide-lock-keyhole"
              size="lg"
              class="w-full"
              :ui="{
                base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
              }"
            />
          </UFormField>

          <div class="pt-2">
            <UButton
              type="submit"
              block
              size="lg"
              :loading="isLoading"
              :disabled="isLoading"
              trailing-icon="i-lucide-arrow-right"
            >
              {{ isLoading ? 'Saving Password...' : 'Save Password & Continue' }}
            </UButton>
          </div>
        </UForm>
      </div>
    </div>
  </div>
</template>
