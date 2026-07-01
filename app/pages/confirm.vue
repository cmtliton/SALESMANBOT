<!-- app/pages/confirm.vue -->
<script setup lang="ts">
const route = useRoute()
const supabase = useSupabaseClient()
const errorMessage = ref<string | null>(null)

// Disable the default layout for a clean full-screen page
definePageMeta({ layout: false })

onMounted(async () => {
  const code = route.query.code as string
  const next = (route.query.next as string) || "/onboarding"

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
      await navigateTo(next, { replace: true })
    } catch (err: unknown) {
      console.error("Error exchanging code for session:", err)
      errorMessage.value
        = err instanceof Error
          ? err.message
          : "Verification failed. The link may have expired or already been used."
    }
  } else {
    const user = useSupabaseUser()
    if (user.value) {
      await navigateTo(next, { replace: true })
    } else {
      errorMessage.value
        = "Invalid access. No authentication code was provided."
    }
  }
})
</script>

<template>
  <div
    class="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4"
  >
    <div class="max-w-md w-full text-center space-y-6">
      <!-- Loading state -->
      <div
        v-if="!errorMessage"
        class="flex flex-col items-center gap-4"
      >
        <svg
          class="animate-spin h-10 w-10 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p class="text-lg font-semibold text-neutral-100 tracking-wide">
          Verifying your account...
        </p>
        <p class="text-neutral-400 text-sm">
          Please wait while we establish your secure session.
        </p>
      </div>

      <!-- Error state using UAlert + UButton -->
      <div
        v-else
        class="flex flex-col items-center gap-4"
      >
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Verification Failed"
          :description="errorMessage"
        />
        <UButton
          to="/login"
          color="primary"
          variant="solid"
          label="Back to Login"
          trailing-icon="i-lucide-arrow-right"
        />
      </div>
    </div>
  </div>
</template>
