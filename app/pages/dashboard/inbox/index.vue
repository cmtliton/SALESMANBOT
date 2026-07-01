<!-- app/pages/dashboard/inbox/index.vue -->
<script setup lang="ts">
import { onMounted } from "vue"

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
    ৩-কলাম রেসপন্সিভ গ্রিড কন্টেইনার।
    মোবাইলে: h-auto (স্বাভাবিক ওপর-নিচে স্ক্রল হবে) এবং overflow-y-auto
    ডেস্কটপে (lg): ফিক্সড ভিউপোর্ট হাইট এবং overflow-hidden (ডাবল স্ক্রলবার প্রতিরোধ করবে)
  -->
  <div
    class="grid grid-cols-1 lg:grid-cols-4 gap-4 h-auto lg:h-[calc(100vh-(--spacing(24)))] overflow-y-auto lg:overflow-hidden"
  >
    <!-- কলাম ১ — Conversation list (মোবাইলে ৩৫০px হাইট, ডেস্কটপে ফুল হাইট) -->
    <div class="lg:col-span-1 h-87.5 lg:h-full min-h-0 overflow-hidden shrink-0">
      <InboxConversationList />
    </div>

    <!-- কলাম ২ — Live chat window (মোবাইলে ৫০০px হাইট, ডেস্কটপে ফুল হাইট) -->
    <div class="lg:col-span-2 h-125 lg:h-full min-h-0 overflow-hidden shrink-0">
      <InboxChatWindow />
    </div>

    <!-- কলাম ৩ — Customer profile + AI summary (মোবাইলে অটো হাইট, ডেস্কটপে ফুল হাইট) -->
    <div class="lg:col-span-1 h-auto lg:h-full min-h-0 overflow-hidden shrink-0">
      <InboxCustomerProfile @create-order="handleCreateOrder" />
    </div>
  </div>
</template>
