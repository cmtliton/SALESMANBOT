// app/store/aiSettings.ts
import { defineStore } from "pinia"
import { ref } from "vue"
import type { AISettings } from "../../prisma/generated/client" // টাইপ-সেফ ইন্টারফেস ইম্পোর্ট করা

export const useAISettingsStore = defineStore("aiSettings", () => {
  const supabase = useSupabaseClient()

  // ২. স্টেট ভেরিয়েবলসমূহ (State)
  const activeSettings = ref<AISettings | null>(null)
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
   * ক. নির্দিষ্ট চ্যানেলের এআই সেটিংস এপিআই থেকে রিড করা
   */
  const fetchSettings = async (channelId: string) => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean, data: AISettings }>("/api/settings/ai", {
        headers,
        query: { channelId }
      })

      if (response && response.data) {
        activeSettings.value = response.data
      } else {
        activeSettings.value = null
      }
    } catch (error) {
      console.error("Error fetching AI settings in store:", error)
      activeSettings.value = null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * খ. নির্দিষ্ট চ্যানেলের এআই সেটিংস সেভ বা আপডেট করা
   */
  const updateSettings = async (channelId: string, payload: Partial<AISettings>) => {
    isLoading.value = false
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean, data: AISettings }>("/api/settings/ai", {
        method: "POST",
        headers,
        body: {
          channelId,
          ...payload
        }
      })

      if (response && response.data) {
        // নতুন আপডেট করা কনফিগ স্টেট লোকাল মেমরিতে সেভ করা হচ্ছে
        activeSettings.value = response.data
      }
      return response
    } catch (error) {
      console.error("Error updating AI settings in store:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    activeSettings,
    isLoading,
    fetchSettings,
    updateSettings
  }
})
