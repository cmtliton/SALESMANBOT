<!-- app/pages/dashboard/integration.vue -->
<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
})

const channelStore = useChannelStore()
const toast = useToast()

// Modal open states
const isMessengerOpen = ref(false)
const isWhatsappOpen = ref(false)

// Fetch connected channels on mount
onMounted(async () => {
  await channelStore.fetchChannels()
})

// Reactive active-channel getters
const activeMessenger = computed(() =>
  channelStore.channels.find(
    c => c.platform === "MESSENGER" && c.status === "ACTIVE"
  )
)

const activeWhatsapp = computed(() =>
  channelStore.channels.find(
    c => c.platform === "WHATSAPP" && c.status === "ACTIVE"
  )
)

// Disconnect handler — native confirm + store action
const handleDisconnect = async (id: string | undefined, platform: string) => {
  if (!id) return

  const confirmed = window.confirm(
    `Are you sure you want to disconnect this ${platform} channel? `
    + "All automated responses will be paused immediately."
  )
  if (!confirmed) return

  try {
    await channelStore.disconnect(id)
    toast.add({
      title: "Channel Disconnected",
      description: `${platform} has been successfully deactivated.`,
      color: "success",
      icon: "i-lucide-circle-check",
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Disconnect failed:", err)
    toast.add({
      title: "Action Failed",
      description: err?.message ?? "Something went wrong. Please try again.",
      color: "error",
      icon: "i-lucide-circle-x",
    })
  }
}

const requestUrl = useRequestURL()
const config = useRuntimeConfig()

const facebookOAuthUrl = computed(() => {
  const appId = config.public.metaAppId // আপনি চাইলে এটি process.env.public.metaAppId থেকেও রিড করতে পারেন
  const redirectUri = encodeURIComponent(`${requestUrl.origin}/api/integration/meta-callback`)

  // যে যে পারমিশনগুলো আমাদের চ্যাটবট রান করতে লাগবে pages_read_engagement
  const scope = encodeURIComponent("pages_show_list,pages_messaging")

  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`
})
</script>

<template>
  <div class="space-y-8">
    <!-- Page header -->
    <div class="pb-5 border-b border-neutral-800">
      <h1 class="text-3xl font-black text-white tracking-tight">
        Channel Integrations
      </h1>
      <p class="mt-1 text-sm text-neutral-400 max-w-2xl">
        Connect your business pages and Cloud APIs to let your AI agents
        automate customer conversations and order pipelines.
      </p>
    </div>

    <!-- 3-column responsive channel card grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- 1. Facebook Messenger -->
      <IntegrationChannelCard
        title="Facebook Messenger"
        icon="i-lucide-facebook"
        icon-color="text-blue-400"
        :is-connected="!!activeMessenger"
        :details-text="activeMessenger
          ? `Connected · Page ID: ${activeMessenger.pageId ?? activeMessenger.id}`
          : 'Connect your Facebook Page to auto-respond to messages, handle queries, and recommend products.'"
        button-text="Connect Messenger"
        @connect="isMessengerOpen = true"
        @disconnect="handleDisconnect(activeMessenger?.id, 'Facebook Messenger')"
      />
      <IntegrationChannelCard
        title="Facebook Messenger"
        icon="i-lucide-facebook"
        icon-color="text-blue-400"
        :is-connected="!!activeMessenger"
        :details-text="activeMessenger
          ? `Connected · Page ID: ${activeMessenger.pageId ?? activeMessenger.id}`
          : 'Connect your Facebook Page to auto-respond to messages, handle queries, and recommend products.'"
        button-text="Connect with Facebook"
        @connect="navigateTo(facebookOAuthUrl, { external: true })"
        @disconnect="handleDisconnect(activeMessenger?.id, 'Facebook Messenger')"
      />
      <!-- 2. WhatsApp Business -->
      <IntegrationChannelCard
        title="WhatsApp Business"
        icon="i-lucide-phone"
        icon-color="text-emerald-400"
        :is-connected="!!activeWhatsapp"
        :details-text="activeWhatsapp
          ? `Connected · Phone Number ID: ${activeWhatsapp.whatsAppPhoneId ?? activeWhatsapp.id}`
          : 'Connect your WhatsApp Business Cloud API to automate customer chats and order workflows.'"
        button-text="Connect WhatsApp"
        @connect="isWhatsappOpen = true"
        @disconnect="handleDisconnect(activeWhatsapp?.id, 'WhatsApp Business')"
      />

      <!-- 3. Instagram Direct (coming soon — no connect/disconnect handlers needed) -->
      <IntegrationChannelCard
        title="Instagram Direct"
        icon="i-lucide-instagram"
        icon-color="text-pink-400"
        :is-connected="false"
        :is-coming-soon="true"
        details-text="Automate Instagram DMs, story replies, and order placements through AI sales assistants."
        button-text="Not Available"
      />
    </div>

    <!-- Modals — mounted at page level so they portal correctly -->
    <IntegrationMessengerModal v-model="isMessengerOpen" />
    <IntegrationWhatsAppModal v-model="isWhatsappOpen" />
  </div>
</template>
