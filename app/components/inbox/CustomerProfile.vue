<!-- app/components/inbox/CustomerProfile.vue -->
<script setup lang="ts">
import { useChatStore } from "../../stores/chat"

const chatStore = useChatStore()
const emit = defineEmits<{ (e: "create-order"): void }>()

// Display name with fallback
const customerName = computed(
  () => chatStore.activeConversation?.customerName ?? "Anonymous Customer"
)

// Prefer phone, fall back to customer ID, then N/A
const customerContact = computed(
  () =>
    chatStore.activeConversation?.customerPhone
    ?? chatStore.activeConversation?.customerId
    ?? "N/A"
)

// Whether the contact value is a phone number (drives the icon shown)
const isPhone = computed(
  () => !!chatStore.activeConversation?.customerPhone
)

// AI summary with sensible placeholder while generating
const aiSummary = computed(
  () =>
    chatStore.activeConversation?.summary
    || "AI is analyzing the conversation to generate a real-time summary…"
)

// True when we actually have a real summary (not the placeholder)
const hasSummary = computed(
  () => !!chatStore.activeConversation?.summary
)
</script>

<template>
  <div
    class="h-full flex flex-col overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl"
  >
    <!-- ── Active conversation: full profile ───────────────────────────────── -->
    <template v-if="chatStore.activeConversation">
      <div class="flex-1 flex flex-col gap-6">
        <!-- 1. Customer Profile metadata -->
        <div class="pb-5 border-b border-neutral-800/50 space-y-3">
          <p class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            Customer Profile
          </p>

          <!-- Avatar + name row -->
          <div class="flex items-center gap-3">
            <UAvatar
              :text="customerName.slice(0, 2).toUpperCase()"
              size="lg"
              class="bg-neutral-800 text-neutral-300 border border-neutral-700 shrink-0"
            />
            <div class="min-w-0">
              <p class="text-base font-black text-white truncate leading-tight">
                {{ customerName }}
              </p>
              <!-- Contact line with contextual icon -->
              <div class="flex items-center gap-1.5 mt-0.5">
                <UIcon
                  :name="isPhone ? 'i-lucide-phone' : 'i-lucide-hash'"
                  class="size-3 text-neutral-500 shrink-0"
                />
                <p class="text-xs text-neutral-400 font-mono tracking-wide truncate">
                  {{ customerContact }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. AI Conversation Summary -->
        <div class="space-y-2">
          <!-- Section label with glowing spark icon -->
          <div class="flex items-center gap-1.5">
            <UIcon
              name="i-lucide-sparkles"
              class="size-3.5 text-purple-400"
              style="filter: drop-shadow(0 0 6px rgba(168, 85, 247, 0.55))"
            />
            <p class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              AI Conversation Summary
            </p>
          </div>

          <!-- Summary card -->
          <div
            class="rounded-2xl border p-4 text-xs leading-relaxed transition-colors"
            :class="
              hasSummary
                ? 'bg-purple-950/20 border-purple-500/20 text-neutral-300'
                : 'bg-neutral-950/40 border-neutral-800/60 text-neutral-500 italic'
            "
          >
            <p>{{ aiSummary }}</p>
          </div>
        </div>

        <!-- 3. Active Tags -->
        <div class="space-y-2">
          <p class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            Active Tags
          </p>

          <div
            v-if="chatStore.activeConversation.tags?.length"
            class="flex flex-wrap gap-1.5"
          >
            <UBadge
              v-for="tag in chatStore.activeConversation.tags"
              :key="tag"
              :label="tag"
              color="success"
              variant="subtle"
              size="sm"
            />
          </div>

          <p
            v-else
            class="text-xs text-neutral-600 italic"
          >
            No tags assigned to this conversation.
          </p>
        </div>
      </div>

      <!-- 4. CTA — Create Order Manually -->
      <div class="mt-6 pt-5 border-t border-neutral-800/50">
        <UButton
          type="button"
          block
          size="lg"
          color="success"
          variant="solid"
          icon="i-lucide-shopping-cart"
          class="rounded-xl font-bold justify-center"
          @click="emit('create-order')"
        >
          Create Order Manually
        </UButton>
      </div>
    </template>

    <!-- ── No active conversation: empty state ─────────────────────────────── -->
    <template v-else>
      <div class="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <div
          class="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-600"
        >
          <UIcon
            name="i-lucide-user-round"
            class="size-7"
          />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-semibold text-neutral-500">
            No customer selected
          </p>
          <p class="text-xs text-neutral-600">
            Click a conversation on the left to view their profile.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
