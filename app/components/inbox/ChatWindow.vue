<!-- app/components/inbox/ChatWindow.vue -->
<script setup lang="ts">
import { useChatStore, type Message } from "../../stores/chat"

const chatStore = useChatStore()

// ─── Refs ────────────────────────────────────────────────────────────────────
const chatContainer = ref<HTMLDivElement | null>(null)
const newMessage = ref("")
const isSending = ref(false)

// ─── Bot toggle (computed with getter + setter) ───────────────────────────────
// Reads the active conversation's bot/pause state; setter calls store action
const isBotActive = computed<boolean>({
  get: () => chatStore.activeConversation?.status === "ACTIVE",
  set: async (enabled: boolean) => {
    if (!chatStore.activeConversation) return
    // toggleBot(id, isPaused): enabled=true → isPaused=false, enabled=false → isPaused=true
    await chatStore.toggleBot(chatStore.activeConversation.id, !enabled)
  }
})

// ─── Guard: only allow send when there is actual content ─────────────────────
const canSend = computed(
  () => newMessage.value.trim().length > 0 && !!chatStore.activeConversation
)

// ─── Send handler ─────────────────────────────────────────────────────────────
const handleSendMessage = async () => {
  if (!canSend.value || isSending.value) return

  const content = newMessage.value.trim()
  isSending.value = true

  try {
    await chatStore.sendMessage(chatStore.activeConversation!.id, content)
    newMessage.value = ""
  } catch (err) {
    console.error("Failed to send message:", err)
  } finally {
    isSending.value = false
  }
}

// ─── Auto-scroll whenever the messages array changes ─────────────────────────
watch(
  () => chatStore.messages,
  () => {
    nextTick(() => {
      if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
      }
    })
  },
  { deep: true }
)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getBubbleClass = (msg: Message): string => {
  if (msg.senderType === "HUMAN") {
    return "bg-emerald-500 text-neutral-950 font-medium rounded-2xl rounded-tr-none"
  }
  if (msg.senderType === "BOT") {
    return "bg-neutral-900 text-neutral-200 rounded-2xl rounded-tl-none border-l-4 border-purple-500"
  }
  // CUSTOMER
  return "bg-neutral-800/70 text-neutral-200 rounded-2xl rounded-tl-none border border-neutral-700/60"
}
</script>

<template>
  <div
    class="h-full flex flex-col overflow-hidden bg-neutral-900 border border-neutral-800 rounded-3xl shadow-xl"
  >
    <!-- ── 1. HEADER ───────────────────────────────────────────────────────── -->
    <div
      class="h-16 shrink-0 flex items-center justify-between px-6 border-b border-neutral-800/60 bg-neutral-900/50"
    >
      <!-- Customer identity -->
      <template v-if="chatStore.activeConversation">
        <div>
          <p class="text-sm font-black text-neutral-100 leading-tight">
            {{ chatStore.activeConversation.customerName ?? 'Active Session' }}
          </p>
          <p class="text-xs text-neutral-500 mt-0.5">
            ID: {{ chatStore.activeConversation.customerId }}
          </p>
        </div>

        <!-- Automate Chat toggle -->
        <div class="flex items-center gap-3">
          <span class="text-xs font-semibold text-neutral-400 select-none">
            Automate Chat
          </span>
          <USwitch
            v-model="isBotActive"
            color="success"
            :checked-icon="'i-lucide-bot'"
            :unchecked-icon="'i-lucide-bot-off'"
          />
        </div>
      </template>

      <!-- No active conversation placeholder -->
      <template v-else>
        <p class="text-sm text-neutral-600">
          No active conversation
        </p>
      </template>
    </div>

    <!-- ── 2. MESSAGE STREAM ───────────────────────────────────────────────── -->
    <div
      ref="chatContainer"
      class="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
    >
      <!-- Empty state: no conversation selected -->
      <div
        v-if="!chatStore.activeConversation"
        class="h-full flex flex-col items-center justify-center gap-4 text-center"
      >
        <div
          class="p-4 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-600"
        >
          <UIcon
            name="i-lucide-message-square-dashed"
            class="size-9"
          />
        </div>
        <p class="text-sm text-neutral-500 max-w-xs">
          Select a conversation from the sidebar to start chatting.
        </p>
      </div>

      <!-- Empty state: conversation selected but no messages yet -->
      <div
        v-else-if="chatStore.messages.length === 0"
        class="h-full flex flex-col items-center justify-center gap-3 text-center"
      >
        <UIcon
          name="i-lucide-inbox"
          class="size-8 text-neutral-700"
        />
        <p class="text-xs text-neutral-600">
          No message history yet. Send a message below to begin.
        </p>
      </div>

      <!-- Message bubbles -->
      <template v-else>
        <div
          v-for="msg in chatStore.messages"
          :key="msg.id"
          class="flex"
          :class="msg.senderType === 'HUMAN' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[75%] px-4 py-3 shadow-md"
            :class="getBubbleClass(msg)"
          >
            <!-- AI REPLIED badge (shown only on BOT messages flagged as AI) -->
            <div
              v-if="msg.senderType === 'BOT' && msg.isAiReplied"
              class="mb-2"
            >
              <UBadge
                label="AI REPLIED"
                color="secondary"
                variant="subtle"
                size="xs"
                icon="i-lucide-sparkles"
                :ui="{ base: 'text-purple-400 bg-purple-500/10 border border-purple-500/20' }"
              />
            </div>

            <!-- Message text -->
            <p class="text-sm leading-relaxed whitespace-pre-wrap">
              {{ msg.content }}
            </p>

            <!-- Timestamp (optional, graceful if missing) -->
            <p
              v-if="msg.createdAt"
              class="mt-1.5 text-[10px] opacity-50 text-right tabular-nums"
            >
              {{ new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
            </p>
          </div>
        </div>
      </template>
    </div>

    <!-- ── 3. FOOTER INPUT ────────────────────────────────────────────────── -->
    <div
      v-if="chatStore.activeConversation"
      class="shrink-0 p-4 border-t border-neutral-800/60 bg-neutral-900/50"
    >
      <form
        class="flex items-end gap-2"
        @submit.prevent="handleSendMessage"
      >
        <UTextarea
          v-model="newMessage"
          placeholder="Type a manual response… (Enter to send, Shift+Enter for new line)"
          color="neutral"
          variant="subtle"
          size="md"
          :rows="1"
          :maxrows="6"
          autoresize
          :disabled="isSending"
          class="flex-1"
          :ui="{
            base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
          }"
          @keydown.enter.exact.prevent="handleSendMessage"
        />

        <UButton
          type="submit"
          color="success"
          variant="solid"
          icon="i-lucide-send-horizontal"
          size="lg"
          :loading="isSending"
          :disabled="!canSend"
          class="shrink-0 rounded-xl font-bold text-neutral-950"
        />
      </form>
    </div>
  </div>
</template>
