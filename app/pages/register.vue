<!-- app/pages/register.vue -->
<script setup lang="ts">
import { z } from "zod"
import type { FormSubmitEvent } from "#ui/types"

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const toast = useToast()

// ── Single reactive state object required by UForm ──
const state = reactive({
  fullName: "",
  email: "",
  password: "",
  phoneNumber: ""
})

const isLoading = ref(false)
const isVerificationSent = ref(false)
const registeredEmail = ref("")

// ── Zod schema ──
// ── Zod v4 compatible schema ──
const schema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .min(2, "Full name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^(?:\+8801|01)[3-9]\d{8}$/,
      "Please enter a valid Bangladeshi phone number (e.g. 01712345678)"
    )
})

// Infer the type from the schema for type safety
type RegisterSchema = z.output<typeof schema>

async function handleRegister(event: FormSubmitEvent<RegisterSchema>) {
  isLoading.value = true
  try {
    const { data, error } = await supabase.auth.signUp({
      email: event.data.email, // ← access via event.data
      password: event.data.password,
      options: {
        data: {
          full_name: event.data.fullName,
          phone_number: event.data.phoneNumber
        }
      }
    })

    if (error) throw error

    if (data?.user) {
      registeredEmail.value = event.data.email
      isVerificationSent.value = true
      toast.add({
        title: "Check your inbox!",
        description: "A verification link has been sent to your email.",
        color: "success",
        icon: "i-lucide-mail-check"
      })
    }
  } catch (err: unknown) {
    toast.add({
      title: "Registration failed",
      description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      color: "error",
      icon: "i-lucide-circle-x"
    })
  } finally {
    isLoading.value = false
  }
}
useHead({
  title: "Register for an Account"
})
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
        <!-- ── Registration Form ── -->
        <div
          v-if="!isVerificationSent"
          key="form"
          class="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6"
        >
          <!-- Header -->
          <div class="text-center space-y-1.5">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
              <UIcon
                name="i-lucide-rocket"
                class="w-6 h-6 text-primary"
              />
            </div>
            <h1 class="text-3xl font-extrabold tracking-tight text-white">
              Get Started
            </h1>
            <p class="text-neutral-400 text-sm">
              Create your AI-Powered Sales Agent account today.
            </p>
          </div>

          <!--
            UForm receives:
              :schema  → the Zod schema for automatic validation
              :state   → the reactive form data object
            @submit   → only fires when ALL fields pass Zod validation.
                        The validated & typed payload is passed as the argument.
          -->
          <UForm
            :schema="schema"
            :state="state"
            class="space-y-4"
            @submit="handleRegister"
          >
            <!-- UFormField name must match the Zod schema key exactly -->
            <UFormField
              name="fullName"
              label="Full Name"
              required
              size="lg"
            >
              <UInput
                v-model="state.fullName"
                placeholder="e.g., Liton Hossain"
                leading-icon="i-lucide-user"
                size="lg"
                class="w-full"
                :ui="{
                  base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
                }"
              />
            </UFormField>

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
              name="phoneNumber"
              label="Phone Number"
              required
              size="lg"
              hint="Bangladeshi numbers only"
            >
              <UInput
                v-model="state.phoneNumber"
                placeholder="e.g., 01712345678"
                leading-icon="i-lucide-phone"
                size="lg"
                class="w-full"
                :ui="{
                  base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
                }"
              />
            </UFormField>

            <UFormField
              name="password"
              label="Password"
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

            <div class="pt-2">
              <UButton
                type="submit"
                block
                size="lg"
                :loading="isLoading"
                :disabled="isLoading"
                trailing-icon="i-lucide-arrow-right"
              >
                {{ isLoading ? 'Creating Account...' : 'Create Free Account' }}
              </UButton>
            </div>
          </UForm>

          <!-- Footer link -->
          <p class="text-center text-sm text-neutral-500">
            Already have an account?
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

        <!-- ── Verification Sent Screen ── -->
        <div
          v-else
          key="verify"
          class="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 shadow-2xl text-center space-y-6"
        >
          <!-- Animated icon -->
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
              Verify Your Email
            </h2>
            <p class="text-neutral-400 text-sm leading-relaxed">
              We've sent a verification link to
            </p>
            <p class="text-primary font-semibold text-base break-all">
              {{ registeredEmail }}
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
              Click the link inside to activate your account.
            </p>
            <p class="flex items-start gap-2">
              <UIcon
                name="i-lucide-clock"
                class="mt-0.5 shrink-0 text-neutral-400"
              />
              The link expires in <strong class="text-neutral-300">24 hours</strong>.
            </p>
          </div>

          <UButton
            to="/login"
            block
            size="lg"
            variant="outline"
            trailing-icon="i-lucide-log-in"
          >
            Go to Login
          </UButton>
        </div>
      </Transition>
    </div>
  </div>
</template>
