<!-- app/pages/forgot-password.vue -->
<script setup lang="ts">
import { z } from "zod"
import type { FormSubmitEvent } from "#ui/types"

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const toast = useToast()
const requestUrl = useRequestURL()

const state = reactive({ email: "" })
const isLoading = ref(false)
const isMailSent = ref(false)

const schema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
})

type ForgotSchema = z.output<typeof schema>

async function handleForgotPassword(event: FormSubmitEvent<ForgotSchema>) {
  isLoading.value = true
  try {
    const redirectTo = `${requestUrl.origin}/confirm?next=/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(event.data.email, {
      redirectTo
    })

    if (error) throw error

    isMailSent.value = true
  } catch (err: unknown) {
    toast.add({
      title: "Request Failed",
      description: err instanceof Error ? err.message : "Failed to send recovery email. Please try again.",
      color: "error",
      icon: "i-lucide-circle-x"
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-950 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-4"
        mode="out-in"
      >
        <!-- ── Request Form ── -->
        <div
          v-if="!isMailSent"
          key="form"
          class="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6"
        >
          <div class="text-center space-y-1.5">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
              <UIcon
                name="i-lucide-key-round"
                class="w-6 h-6 text-primary"
              />
            </div>
            <h1 class="text-3xl font-extrabold tracking-tight text-white">
              Reset Password
            </h1>
            <p class="text-neutral-400 text-sm">
              Enter your email and we'll send you a recovery link.
            </p>
          </div>

          <UForm
            :schema="schema"
            :state="state"
            class="space-y-4"
            @submit="handleForgotPassword"
          >
            <UFormField
              name="email"
              label="Email Address"
              required
              size="lg"
            >
              <UInput
                v-model="state.email"
                type="email"
                placeholder="you@example.com"
                leading-icon="i-lucide-mail"
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
                trailing-icon="i-lucide-send"
              >
                {{ isLoading ? 'Sending Link...' : 'Send Recovery Link' }}
              </UButton>
            </div>
          </UForm>

          <p class="text-center text-sm text-neutral-500">
            Remembered your password?
            <UButton
              to="/login"
              variant="link"
              color="primary"
              size="sm"
              class="ml-0.5 font-semibold"
            >
              Sign In
            </UButton>
          </p>
        </div>

        <!-- ── Success Screen ── -->
        <div
          v-else
          key="success"
          class="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 shadow-2xl text-center space-y-6"
        >
          <div class="flex justify-center">
            <div class="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
              <UIcon
                name="i-lucide-mail-check"
                class="w-10 h-10 text-primary"
              />
              <span class="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            </div>
          </div>

          <div class="space-y-2">
            <h2 class="text-2xl font-extrabold text-white">
              Check Your Inbox
            </h2>
            <p class="text-neutral-400 text-sm leading-relaxed">
              We've sent a recovery link to
            </p>
            <p class="text-primary font-semibold text-base break-all">
              {{ state.email }}
            </p>
          </div>

          <div class="bg-neutral-800/60 rounded-2xl px-5 py-4 text-xs text-neutral-500 leading-relaxed text-left space-y-1.5">
            <p class="flex items-start gap-2">
              <UIcon
                name="i-lucide-inbox"
                class="mt-0.5 shrink-0 text-neutral-400"
              />
              Check your <strong class="text-neutral-300">inbox</strong> and
              <strong class="text-neutral-300">spam folder</strong>.
            </p>
            <p class="flex items-start gap-2">
              <UIcon
                name="i-lucide-mouse-pointer-click"
                class="mt-0.5 shrink-0 text-neutral-400"
              />
              Click the recovery link to set a new password.
            </p>
            <p class="flex items-start gap-2">
              <UIcon
                name="i-lucide-clock"
                class="mt-0.5 shrink-0 text-neutral-400"
              />
              The link expires in <strong class="text-neutral-300">1 hour</strong>.
            </p>
          </div>

          <UButton
            to="/login"
            block
            size="lg"
            variant="outline"
            trailing-icon="i-lucide-log-in"
          >
            Back to Login
          </UButton>
        </div>
      </Transition>
    </div>
  </div>
</template>
