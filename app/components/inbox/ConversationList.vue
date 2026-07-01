<!-- app/components/inbox/ConversationList.vue -->
<script setup lang="ts">
import { useChatStore, type Conversation } from "../../stores/chat"

const chatStore = useChatStore()
const searchQuery = ref("")

// Reactive filtering by name, customer ID, or phone
const filteredConversations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return chatStore.conversations

  return chatStore.conversations.filter((conv) => {
    const name = (conv.customerName ?? "").toLowerCase()
    const id = conv.customerId.toLowerCase()
    const phone = (conv.customerPhone ?? "").toLowerCase()
    return name.includes(query) || id.includes(query) || phone.includes(query)
  })
})

// Select conversation and load its messages
const selectConversation = async (conv: Conversation) => {
  chatStore.activeConversation = conv
  await chatStore.fetchMessages(conv.id)
}

// Derive platform icon, color, and label from conversation metadata
const getPlatformDetails = (conv: Conversation) => {
  if (conv.customerPhone) {
    return { icon: "i-lucide-message-circle", color: "text-emerald-400", label: "WhatsApp" }
  }
  return { icon: "i-lucide-facebook", color: "text-blue-400", label: "Messenger" }
}

// Generate avatar initials fallback
const getInitials = (conv: Conversation): string => {
  const name = conv.customerName ?? conv.customerId ?? "?"
  return name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("")
}

// Check if a conversation is currently active
const isActive = (conv: Conversation) =>
  chatStore.activeConversation?.id === conv.id
</script>

<template>
  <div
    class="h-full flex flex-col overflow-hidden bg-neutral-900 border border-neutral-800 rounded-3xl shadow-xl"
  >
    <!-- Search Header -->
    <div class="p-4 border-b border-neutral-800/60 shrink-0">
      <UInput
        v-model="searchQuery"
        placeholder="Search by name, ID or phone…"
        icon="i-lucide-search"
        color="neutral"
        variant="subtle"
        size="md"
        class="w-full"
        :ui="{
          base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
        }"
      />
    </div>

    <!-- Conversation List (scrollable) -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading State -->
      <template v-if="chatStore.isInboxLoading">
        <div
          v-for="i in 5"
          :key="i"
          class="flex items-start gap-3 p-4 border-b border-neutral-800/40"
        >
          <USkeleton class="h-9 w-9 rounded-xl shrink-0" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-3.5 w-2/3 rounded" />
            <USkeleton class="h-3 w-full rounded" />
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div
        v-else-if="filteredConversations.length === 0"
        class="flex flex-col items-center justify-center h-full py-12 px-4 text-center gap-3"
      >
        <div class="p-3 bg-neutral-800 rounded-full">
          <UIcon
            name="i-lucide-inbox"
            class="h-6 w-6 text-neutral-500"
          />
        </div>
        <p class="text-sm text-neutral-500">
          No conversations yet.
        </p>
      </div>

      <!-- Conversation Rows -->
      <template v-else>
        <button
          v-for="conv in filteredConversations"
          :key="conv.id"
          type="button"
          class="w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-neutral-800/40 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          :class="
            isActive(conv)
              ? 'bg-neutral-800/60 border-l-[3px] border-l-emerald-500 pl-3.25'
              : 'hover:bg-neutral-800/30'
          "
          @click="selectConversation(conv)"
        >
          <!-- Avatar with initials fallback -->
          <UAvatar
            :text="getInitials(conv)"
            size="md"
            class="shrink-0 mt-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700"
          />

          <!-- Content -->
          <div class="flex-1 min-w-0 space-y-1">
            <!-- Top row: name + platform badge -->
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-semibold text-neutral-100 truncate">
                {{ conv.customerName ?? 'Anonymous' }}
              </span>
              <!-- Platform icon pill -->
              <span
                class="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700"
              >
                <UIcon
                  :name="getPlatformDetails(conv).icon"
                  class="size-3"
                  :class="getPlatformDetails(conv).color"
                />
                <span
                  class="text-[10px] font-medium"
                  :class="getPlatformDetails(conv).color"
                >
                  {{ getPlatformDetails(conv).label }}
                </span>
              </span>
            </div>

            <!-- Subtitle: phone or customer ID -->
            <p class="text-xs text-neutral-500 truncate">
              {{ conv.customerPhone ?? conv.customerId }}
            </p>

            <!-- Last message snippet -->
            <p
              v-if="conv.lastMessage"
              class="text-xs text-neutral-400 truncate leading-relaxed"
            >
              {{ conv.lastMessage }}
            </p>

            <!-- Tags -->
            <div
              v-if="conv.tags && conv.tags.length > 0"
              class="flex flex-wrap gap-1 pt-0.5"
            >
              <UBadge
                v-for="tag in conv.tags"
                :key="tag"
                :label="tag"
                color="neutral"
                variant="subtle"
                size="xs"
              />
            </div>
          </div>
        </button>
      </template>
    </div>
  </div>
</template>
