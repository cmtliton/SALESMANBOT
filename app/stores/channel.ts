// app/store/channel.ts
import { defineStore } from "pinia"
import { ref } from "vue"

// ১. এআই সেটিংস ও চ্যানেলের জন্য টাইপ-সেফ ইন্টারফেস ডিফাইন করা
export interface AISettings {
  id: string
  provider: string
  modelName: string
  systemPrompt: string
  smartReplyDelay: number
  memoryContextLimit: number
}

export interface Channel {
  id: string
  platform: "WHATSAPP" | "MESSENGER" | "INSTAGRAM"
  status: "ACTIVE" | "INACTIVE" | "COMING_SOON"
  pageId?: string | null
  pageAccessToken?: string | null
  whatsAppPhoneId?: string | null
  whatsAppAccountId?: string | null
  whatsAppAccessToken?: string | null
  webhookVerifyToken: string
  organizationId: string
  createdAt: string
  updatedAt: string
  aiSettings?: AISettings | null
}

export const useChannelStore = defineStore("channel", () => {
  const supabase = useSupabaseClient()

  // ২. স্টেট ভেরিয়েবলসমূহ (State)
  const channels = ref<Channel[]>([])
  const isLoading = ref(false)

  // ৩. ডমেস্টিক হেল্পার ফাংশন (অথেনটিকেশন ও কুকি ফরওয়ার্ডিংয়ের জন্য)
  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {}

    if (import.meta.server) {
      // সার্ভার সাইড রেন্ডারিংয়ের সময় সেশন কুকি ফরওয়ার্ড করা হচ্ছে
      const cookieHeader = useRequestHeaders(["cookie"]).cookie
      if (cookieHeader) {
        headers.cookie = cookieHeader
      }
    } else {
      // ক্লায়েন্ট-সাইডে রিয়েল-টাইম সেশন টোকেন নিয়ে Authorization হেডারে ইনজেক্ট করা হচ্ছে
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
    }
    return headers
  }

  // ৪. অ্যাকশনসমূহ (Actions)

  /**
   * ক. অর্গানাইজেশনের সমস্ত কানেক্টেড চ্যানেল এপিআই থেকে রিড করা
   */
  const fetchChannels = async () => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean, data: Channel[] }>("/api/integration", { headers })

      if (response && response.data) {
        channels.value = response.data
      }
    } catch (error) {
      console.error("Error fetching channels in store:", error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * খ. ফেসবুক মেসেঞ্জার চ্যানেল ম্যানুয়ালি যুক্ত করা
   */
  const connectMessenger = async (payload: { pageName: string, pageId: string, pageAccessToken: string }) => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean, data: Channel }>("/api/integration/messenger-manual", {
        method: "POST",
        headers,
        body: payload,
      })

      // কানেক্ট সফল হওয়ার পর লোকাল চ্যানেল লিস্ট রিফ্রেশ করা হচ্ছে
      await fetchChannels()
      return response
    } catch (error) {
      console.error("Error connecting Messenger channel in store:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * গ. হোয়াটসঅ্যাপ বিজনেস ক্লাউড একাউন্ট ম্যানুয়ালি যুক্ত করা
   */
  const connectWhatsApp = async (payload: { phoneId: string, accountId: string, accessToken: string }) => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean, data: Channel }>("/api/integration/whatsapp-manual", {
        method: "POST",
        headers,
        body: payload,
      })

      // সিঙ্ক সফল হওয়ার পর লোকাল চ্যানেল লিস্ট রিফ্রেশ করা হচ্ছে
      await fetchChannels()
      return response
    } catch (error) {
      console.error("Error connecting WhatsApp channel in store:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * ঘ. একটি নির্দিষ্ট অ্যাক্টিভ চ্যানেল ডিসকানেক্ট বা ডিঅ্যাক্টিভেট করা
   */
  const disconnect = async (channelId: string) => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      await $fetch("/api/integration", {
        method: "DELETE",
        headers,
        query: { id: channelId },
      })

      // সফলভাবে ডিলিট হওয়ার পর লোকাল স্টোরের অ্যারেকে ফিল্টার করার পরিবর্তে
      // ওই সুনির্দিষ্ট চ্যানেলের স্ট্যাটাসটি রিয়েক্টিভালি 'INACTIVE' এ সেট করা হচ্ছে
      channels.value = channels.value.map((c) => {
        if (c.id === channelId) {
          return { ...c, status: "INACTIVE" as const }
        }
        return c
      })
    } catch (error) {
      console.error("Error disconnecting channel in store:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    channels,
    isLoading,
    fetchChannels,
    connectMessenger,
    connectWhatsApp,
    disconnect,
  }
})
