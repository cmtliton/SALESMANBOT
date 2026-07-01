<!-- app/components/admin/AccessDenied.vue -->
<template>
  <div class="min-h-[60vh] flex items-center justify-center px-4">
    <div class="bg-neutral-900 border border-error/20 p-8 rounded-3xl text-center space-y-5 shadow-2xl max-w-md w-full">
      <!-- Glowing lock icon -->
      <div class="inline-flex p-4 bg-error/10 rounded-full border border-error/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse">
        <UIcon
          name="i-lucide-lock-keyhole"
          class="w-10 h-10 text-error"
        />
      </div>

      <!-- Heading + description -->
      <div class="space-y-2">
        <h2 class="text-2xl font-black text-white tracking-tight">
          Access Denied
        </h2>
        <p class="text-neutral-400 text-sm leading-relaxed px-2">
          You do not have the required administrative permissions to access
          this verification panel. If you believe this is an error, please
          contact your workspace owner.
        </p>
      </div>

      <!-- CTA -->
      <UButton
        to="/dashboard"
        color="neutral"
        variant="ghost"
        size="lg"
        leading-icon="i-lucide-arrow-left"
        class="font-semibold"
      >
        Go back to Dashboard
      </UButton>
    </div>
  </div>
</template>
