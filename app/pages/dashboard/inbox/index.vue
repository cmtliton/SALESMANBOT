<!-- app/pages/dashboard/inbox/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: "dashboard"
})

const chatStore = useChatStore()

// Fetch all active conversations as soon as the page mounts
onMounted(async () => {
  await chatStore.fetchConversations()
})

// Handler for CustomerProfile's "Create Order Manually" CTA
// Swap the body for your actual modal/navigation logic
const handleCreateOrder = () => {
  const convId = chatStore.activeConversation?.id
  if (!convId) return
  // e.g. navigateTo(`/dashboard/orders/new?conversationId=${convId}`)
  alert("Create order for conversation:" + convId)
}
</script>

<template>
  <!--
    3-column responsive grid.
    h-[calc(100vh-theme(spacing.24))] fills the viewport minus the
    dashboard navbar height (assumed 6rem / 24 spacing units).
    overflow-hidden prevents double scrollbars — each column manages
    its own internal scroll independently.
  -->
  <div
    class="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-(--spacing(24)))] overflow-hidden"
  >
    <!-- Column 1 — Conversation list (1 / 4 columns) -->
    <div class="lg:col-span-1 min-h-0 overflow-hidden">
      <InboxConversationList />
    </div>

    <!-- Column 2 — Live chat window (2 / 4 columns) -->
    <div class="lg:col-span-2 min-h-0 overflow-hidden">
      <InboxChatWindow />
    </div>

    <!-- Column 3 — Customer profile + AI summary (1 / 4 columns) -->
    <div class="lg:col-span-1 min-h-0 overflow-hidden">
      <InboxCustomerProfile @create-order="handleCreateOrder" />
    </div>
  </div>
</template>
