<script setup lang="ts">
interface Message {
  id: string
  content: string
  senderType: "HUMAN" | "BOT" | "CUSTOMER"
  isAiReplied?: boolean
  status?: "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED"
  createdAt?: string
  senderName?: string
  isDeleted?: boolean
}

type GroupPosition = "first" | "middle" | "last" | "solo"

const props = defineProps<{
  messages: Message[]
  hasConversation: boolean
  isLoading?: boolean
}>()

const emit = defineEmits<{
  "retry-message": [message: Message]
}>()

// ━━ auto-scroll ref ━━
const containerRef = ref<HTMLDivElement | null>(null)

const scrollToBottom = (smooth = true) => {
  nextTick(() => {
    if (!containerRef.value) return
    containerRef.value.scrollTo({
      top: containerRef.value.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    })
  })
}

// নতুন মেসেজ এলে auto-scroll
watch(
  () => props.messages.length,
  (newLen, oldLen) => {
    // নতুন মেসেজ যোগ হলে smooth scroll
    // প্রথমবার load হলে instant scroll
    scrollToBottom(oldLen > 0)
  },
)

// conversation switch হলে instant scroll
watch(
  () => props.hasConversation,
  () => scrollToBottom(false),
)

onMounted(() => scrollToBottom(false))

// ━━ Grouping helpers ━━
const shouldShowAvatar = (i: number): boolean => {
  const msg = props.messages[i]
  if (msg?.senderType === "HUMAN") return false
  return i === 0 || props.messages[i - 1].senderType !== msg?.senderType
}

const shouldShowTimestamp = (i: number): boolean => {
  const msg = props.messages[i]
  const next = props.messages[i + 1]
  if (!next) return true
  // পরের মেসেজ ভিন্ন sender হলে timestamp দেখাও
  if (next?.senderType !== msg?.senderType) return true
  // ৫ মিনিটের বেশি gap হলে timestamp দেখাও
  if (msg?.createdAt && next?.createdAt) {
    const gap = new Date(next?.createdAt).getTime() - new Date(msg?.createdAt).getTime()
    if (gap > 5 * 60 * 1000) return true
  }
  return false
}

const getGroupPosition = (i: number): GroupPosition => {
  const msgs = props.messages
  const cur = msgs[i].senderType
  const prev = msgs[i - 1]?.senderType === cur
  const next = msgs[i + 1]?.senderType === cur

  // ৫ মিনিটের বেশি gap থাকলে solo হিসেবে গণ্য করো
  const prevClose = prev && (() => {
    if (!msgs[i].createdAt || !msgs[i - 1].createdAt) return true
    return new Date(msgs[i].createdAt!).getTime()
      - new Date(msgs[i - 1].createdAt!).getTime() < 5 * 60 * 1000
  })()

  const nextClose = next && (() => {
    if (!msgs[i].createdAt || !msgs[i + 1].createdAt) return true
    return new Date(msgs[i + 1].createdAt!).getTime()
      - new Date(msgs[i].createdAt!).getTime() < 5 * 60 * 1000
  })()

  if (prevClose && nextClose) return "middle"
  if (prevClose && !nextClose) return "last"
  if (!prevClose && nextClose) return "first"
  return "solo"
}

// ━━ Date separator ━━
// পরপর দুটো মেসেজ ভিন্ন দিনের হলে date label দেখাও
const needsDateSeparator = (i: number): string | null => {
  const msg = props.messages[i]
  const prev = props.messages[i - 1]
  if (!msg.createdAt) return null

  const msgDate = new Date(msg.createdAt).toDateString()
  const prevDate = prev?.createdAt ? new Date(prev.createdAt).toDateString() : null

  if (msgDate === prevDate) return null

  const date = new Date(msg.createdAt)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  })
}

// ━━ expose scrollToBottom for parent ━━
defineExpose({ scrollToBottom })
</script>

<template>
  <div
    ref="containerRef"
    class="flex-1 overflow-y-auto overscroll-contain px-5 py-4
           bg-neutral-950/30 space-y-0"
    role="log"
    aria-live="polite"
    aria-label="Chat messages"
  >
    <!-- ── No conversation selected ── -->
    <div
      v-if="!hasConversation"
      class="h-full flex flex-col items-center justify-center gap-4 text-center"
    >
      <div
        class="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-700"
      >
        <UIcon
          name="i-lucide-message-square"
          class="h-10 w-10"
        />
      </div>
      <div>
        <p class="text-sm font-semibold text-neutral-400">
          No conversation selected
        </p>
        <p class="text-xs text-neutral-600 mt-1.5 leading-relaxed">
          Pick a chat from the left sidebar to begin.
        </p>
      </div>
    </div>

    <!-- ── Loading skeleton ── -->
    <template v-else-if="isLoading">
      <div
        v-for="i in 6"
        :key="`msg-skel-${i}`"
        class="flex mt-3"
        :class="i % 3 === 0 ? 'justify-end' : 'justify-start'"
      >
        <div
          class="flex items-end gap-2"
          :class="i % 3 === 0 ? 'flex-row-reverse' : 'flex-row'"
        >
          <USkeleton
            v-if="i % 3 !== 0"
            class="h-7 w-7 rounded-xl flex-shrink-0"
          />
          <div
            class="space-y-1"
            :class="i % 3 === 0 ? 'items-end' : 'items-start'"
          >
            <USkeleton
              class="h-9 rounded-2xl"
              :class="[
                ['w-40', 'w-56', 'w-32', 'w-48', 'w-36', 'w-52'][i % 6]
              ]"
            />
            <USkeleton class="h-2.5 w-10 rounded ml-auto" />
          </div>
        </div>
      </div>
    </template>

    <!-- ── Empty messages ── -->
    <div
      v-else-if="messages.length === 0"
      class="h-full flex flex-col items-center justify-center gap-3"
    >
      <div
        class="p-3 bg-neutral-900 border border-neutral-800 rounded-xl"
      >
        <UIcon
          name="i-lucide-messages-square"
          class="h-7 w-7 text-neutral-600"
        />
      </div>
      <p class="text-xs text-neutral-600 text-center leading-relaxed">
        No messages yet.<br>Send the first one below!
      </p>
    </div>

    <!-- ── Message list ── -->
    <template v-else>
      <template
        v-for="(msg, index) in messages"
        :key="msg.id"
      >
        <!-- Date separator -->
        <div
          v-if="needsDateSeparator(index)"
          class="flex items-center gap-3 my-4"
          aria-label="Date separator"
        >
          <div class="flex-1 h-px bg-neutral-800/60" />
          <span
            class="text-[10px] text-neutral-600 font-medium px-2
                   bg-neutral-950/30 rounded-full border border-neutral-800/60
                   py-0.5 whitespace-nowrap"
          >
            {{ needsDateSeparator(index) }}
          </span>
          <div class="flex-1 h-px bg-neutral-800/60" />
        </div>

        <!-- Message bubble -->
        <InboxChatMessageBubble
          :message="msg"
          :show-avatar="shouldShowAvatar(index)"
          :show-timestamp="shouldShowTimestamp(index)"
          :group-position="getGroupPosition(index)"
          @retry="emit('retry-message', $event)"
        />
      </template>

      <!-- Scroll anchor -->
      <div
        class="h-1"
        aria-hidden="true"
      />
    </template>
  </div>
</template>
