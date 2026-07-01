// app/store/chat.ts
import { defineStore } from "pinia"

// ১. চ্যাট এবং মেসেজের জন্য টাইপ-সেফ ইন্টারফেস ডিফাইন করা
export interface Conversation {
  id: string
  customerId: string
  customerName?: string | null
  customerPhone?: string | null
  summary?: string | null
  lastMessage: string
  tags: string[]
  status: "ACTIVE" | "PAUSED_BY_USER" | "ARCHIVED"
  createdAt: string
  updatedAt: string
  organizationId: string
  channelId: string
}

export interface Message {
  id: string
  conversationId: string
  senderType: "CUSTOMER" | "BOT" | "HUMAN"
  content: string
  imageUrl?: string | null
  videoUrl?: string | null
  isAiReplied: boolean
  createdAt: string
}

export const useChatStore = defineStore("chat", () => {
  const supabase = useSupabaseClient()

  // ২. স্টেট ভেরিয়েবলসমূহ (State)
  const conversations = ref<Conversation[]>([])
  const activeConversation = ref<Conversation | null>(null)
  const messages = ref<Message[]>([])
  const isInboxLoading = ref(false)

  // ৩. রিকোয়েস্ট অথেনটিকেশন হেডার জেনারেটর (৪০১ এরর এড়াতে)
  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {}
    if (import.meta.server) {
      const cookieHeader = useRequestHeaders(["cookie"]).cookie
      if (cookieHeader) {
        headers.cookie = cookieHeader
      }
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
    }
    return headers
  }

  // ৪. রিয়েল-টাইম সিঙ্ক মেকানিজম (Supabase Realtime Subscription)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let messageChannel: any = null

  const subscribeToMessages = () => {
    if (messageChannel) {
      supabase.removeChannel(messageChannel)
    }

    // Supabase Realtime দিয়ে মেসেজ টেবিলের নতুন রো ইনসার্টগুলো লিসেন করা হচ্ছে
    messageChannel = supabase
      .channel("public:Message")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message"
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newMsg = payload.new as Message

          // যদি ইনকামিং মেসেজটি বর্তমানে এক্টিভ চ্যাট সেশনের অন্তর্ভুক্ত হয়, তবে পুশ করা হবে
          if (activeConversation.value && newMsg.conversationId === activeConversation.value.id) {
            const exists = messages.value.some(m => m.id === newMsg.id)
            if (!exists) {
              messages.value.push(newMsg)
            }
          }

          // রিয়েল-টাইমে ইনবক্সের সাইডবার লিস্টের অবস্থান আপডেট করা (লেটেস্ট মেসেজ সংবলিত চ্যাট উপরে আনা)
          const matchedConv = conversations.value.find(c => c.id === newMsg.conversationId)
          if (matchedConv) {
            // কনভারসেশন লিস্টের ফিল্টার পজিশন আপডেট
            conversations.value = [
              matchedConv,
              ...conversations.value.filter(c => c.id !== newMsg.conversationId)
            ]
          }
        }
      )
      .subscribe()
  }

  // ৫. অ্যাকশনসমূহ (Actions)

  /**
   * ক. অর্গানাইজেশনের সমস্ত এক্টিভ চ্যাট সেশন কুয়েরি করা
   */
  const fetchConversations = async () => {
    isInboxLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean, data: Conversation[] }>("/api/chat/conversations", { headers })
      if (response && response.data) {
        conversations.value = response.data
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      isInboxLoading.value = false
    }
  }

  /**
   * খ. নির্দিষ্ট চ্যাট সেশনের মেসেজ হিস্ট্রি কুয়েরি করা
   */
  const fetchMessages = async (conversationId: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean, data: Message[] }>("/api/chat/messages", {
        headers,
        query: { conversationId }
      })
      if (response && response.data) {
        messages.value = response.data
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }

  /**
   * গ. হিউম্যান এজেন্ট হিসেবে চ্যাটে ম্যানুয়াল মেসেজ পাঠানো
   */
  const sendMessage = async (conversationId: string, content: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean, data: Message }>("/api/chat/send", {
        method: "POST",
        headers,
        body: { conversationId, content }
      })

      if (response && response.data) {
        // যদি ইউজার এখনো একই উইন্ডোতে থাকে, তবে মেসেজটি পুশ করা হচ্ছে
        if (activeConversation.value && activeConversation.value.id === conversationId) {
          const exists = messages.value.some(m => m.id === response.data.id)
          if (!exists) {
            messages.value.push(response.data)
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      throw error
    }
  }

  /**
   * ঘ. চ্যাট অটোমেশন চালু/বন্ধ করা (হিউম্যান হ্যান্ডওভার টগল)
   */
  const toggleBot = async (conversationId: string, isPaused: boolean) => {
    try {
      const headers = await getAuthHeaders()
      await $fetch("/api/chat/toggle-bot", {
        method: "POST",
        headers,
        body: { conversationId, isPaused }
      })

      // লোকাল স্টেটের স্ট্যাটাস আপডেট করা
      const statusToSet = isPaused ? ("PAUSED_BY_USER" as const) : ("ACTIVE" as const)

      if (activeConversation.value && activeConversation.value.id === conversationId) {
        activeConversation.value.status = statusToSet
      }

      const conv = conversations.value.find(c => c.id === conversationId)
      if (conv) {
        conv.status = statusToSet
      }
    } catch (error) {
      console.error("Error toggling bot:", error)
      throw error
    }
  }

  // পিনিয়া স্টোর ইনিশিয়েট হওয়ার সময় রিয়েল-টাইম লিসেনার চালু করা
  onMounted(() => {
    if (import.meta.client) {
      subscribeToMessages()
    }
  })

  return {
    conversations,
    activeConversation,
    messages,
    isInboxLoading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    toggleBot,
  }
})
