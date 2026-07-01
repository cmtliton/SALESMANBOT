<!-- app/pages/login.vue -->
<script setup lang="ts">
import { z } from "zod"
import type { FormSubmitEvent } from "#ui/types"

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const toast = useToast()

const state = reactive({
  email: "",
  password: ""
})

const isLoading = ref(false)

// ── Zod schema ──
const schema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
})

type LoginSchema = z.output<typeof schema>

// ── Supabase error message normalizer ──
function parseAuthError(message: string): string {
  if (message === "Invalid login credentials") {
    return "Incorrect email or password. Please try again."
  }
  if (message === "Email not confirmed") {
    return "Your email is not verified yet. Please check your inbox."
  }
  if (message.toLowerCase().includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again."
  }
  return message || "Something went wrong. Please try again."
}

// ── Login handler ──
async function handleLogin(event: FormSubmitEvent<LoginSchema>) {
  isLoading.value = true
  try {
    // 1. Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: event.data.email,
      password: event.data.password
    })

    if (error) throw error

    if (data?.user && data?.session) {
      // 2. Pass the access token directly in the Authorization header.
      //    This avoids any cookie sync delay on the server side.
      const status = await $fetch<{ hasOrg: boolean }>("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`
        }
      })

      toast.add({
        title: "Welcome back!",
        description: "You have signed in successfully.",
        color: "success",
        icon: "i-lucide-circle-check"
      })

      // 3. Route based on org status
      await navigateTo(status.hasOrg ? "/dashboard" : "/onboarding", {
        replace: true
      })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong."
    toast.add({
      title: "Authentication Failed",
      description: parseAuthError(message),
      color: "error",
      icon: "i-lucide-circle-x"
    })
  } finally {
    isLoading.value = false
  }
}
useHead({
  title: "Login to Your Account"
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
              name="i-lucide-lock-keyhole"
              class="w-6 h-6 text-primary"
            />
          </div>
          <h1 class="text-3xl font-extrabold tracking-tight text-white">
            Welcome Back
          </h1>
          <p class="text-neutral-400 text-sm">
            Sign in to manage your AI sales agents.
          </p>
        </div>

        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="handleLogin"
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

          <UFormField
            name="password"
            required
            size="lg"
          >
            <!-- Custom label slot to place 'Forgot Password?' inline with the label -->
            <template #label>
              <div class="flex items-center justify-between w-full">
                <span class="text-sm font-medium">
                  Password <span class="text-error">*</span>
                </span>
                <UButton
                  to="/forgot-password"
                  variant="link"
                  color="primary"
                  size="xs"
                  class="-my-1"
                >
                  Forgot Password?
                </UButton>
              </div>
            </template>

            <UInput
              v-model="state.password"
              type="password"
              placeholder="••••••••"
              leading-icon="i-lucide-lock"
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
              {{ isLoading ? 'Signing In...' : 'Sign In' }}
            </UButton>
          </div>
        </UForm>

        <!-- Footer -->
        <p class="text-center text-sm text-neutral-500">
          Don't have an account?
          <UButton
            to="/register"
            variant="link"
            color="primary"
            size="sm"
            class="ml-0.5 font-semibold"
          >
            Sign Up Free
          </UButton>
        </p>
      </div>
    </div>
  </div>
</template>
