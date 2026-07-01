// app/stores/auth.ts
import { defineStore } from "pinia"
import { ref, computed } from "vue"

// ১. টাইপসেফটির জন্য ইন্টারফেস ডিফাইন করা
export interface Workspace {
  id: string
  name: string
  walletBalance: string | number
  bonusCredit: number
  permanentCredit: number
  dailyQuotaLimit: number
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  phoneNumber: string | null
  role: "OWNER" | "ADMIN" | "MEMBER"
  organizationId: string | null
  organization?: Workspace | null
}

export const useAuthStore = defineStore("auth", () => {
  const supabase = useSupabaseClient()

  // ২. স্টেট ভেরিয়েবলসমূহ (State Variables)
  const user = ref<UserProfile | null>(null)
  const organization = ref<Workspace | null>(null)
  const isAuthenticated = ref(false)
  const hasOrg = ref(false)
  const isLoading = ref(false)

  // ৩. কম্পিউটেড প্রোপার্টিজ (Computed Properties - UI-তে রেন্ডার সহজ করার জন্য)
  const totalCredits = computed(() => {
    if (!organization.value) return 0
    return organization.value.bonusCredit + organization.value.permanentCredit
  })

  const formattedWalletBalance = computed(() => {
    if (!organization.value) return "৳ 0.00"
    const balance = Number(organization.value.walletBalance)
    return `৳ ${balance.toFixed(2)}`
  })
  const dailyQuotaLimit = computed(() => {
    if (!organization.value) return 0
    return organization.value.dailyQuotaLimit
  })

  // ৪. অ্যাকশনসমূহ (Actions)

  // সেশন ক্লিয়ার করার অ্যাকশন (লগআউটের সময় ব্যবহূত হবে)
  const clearSession = () => {
    user.value = null
    organization.value = null
    isAuthenticated.value = false
    hasOrg.value = false
    isLoading.value = false
  }

  // কাস্টমার অথেনটিকেশন ও অর্গানাইজেশন স্ট্যাটাস ফেচ করার অ্যাকশন
  const fetchUserStatus = async () => {
    isLoading.value = true
    try {
      const headers: Record<string, string> = {}

      if (import.meta.server) {
        // সার্ভার-সাইড (SSR) এ রিকুয়েস্ট কুকি ফরওয়ার্ড করা হচ্ছে
        const cookieHeader = useRequestHeaders(["cookie"]).cookie
        if (cookieHeader) {
          headers.cookie = cookieHeader
        }
      } else {
        // ক্লায়েন্ট-সাইডে রিয়েল-টাইম টোকেন ব্যবহার করা হচ্ছে (কুকি ডিলে এড়াতে)
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`
        }
      }

      // এপিআই কল
      const data = await $fetch<{
        isAuthenticated: boolean
        hasOrg: boolean
        user: UserProfile | null
      }>("/api/auth/me", { headers })

      if (data) {
        isAuthenticated.value = data.isAuthenticated
        hasOrg.value = data.hasOrg
        user.value = data.user

        // যদি ডাটাবেস ইউজার অর্গানাইজেশনের সাথে যুক্ত থাকে, তবে অর্গানাইজেশন স্টেট আপডেট করবে
        if (data.user?.organization) {
          organization.value = data.user.organization
        } else {
          organization.value = null
        }
      }
    } catch (error) {
      console.error("Error fetching user status in auth store:", error)
      clearSession()
    } finally {
      isLoading.value = false
    }
  }

  return {
    user,
    organization,
    isAuthenticated,
    hasOrg,
    isLoading,
    totalCredits,
    formattedWalletBalance,
    dailyQuotaLimit,
    fetchUserStatus,
    clearSession
  }
})
