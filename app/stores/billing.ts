// app/store/billing.ts
import { defineStore } from "pinia"
import { ref } from "vue"
import { useAuthStore } from "./auth" // গ্লোবাল ব্যালেন্স ও ক্রেডিট সিঙ্ক করার জন্য [1.1]

// ১. ডিপোজিট ডাটার জন্য টাইপ-সেফ ইন্টারফেস ডিফাইন করা [1.1]
export interface ManualDeposit {
  id: string
  method: "BKASH" | "NAGAD" | "ROCKET"
  senderNumber: string
  transactionId: string
  amount: string | number
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  updatedAt: string
  organizationId: string
  organization?: {
    name: string
  } | null
}

export const useBillingStore = defineStore("billing", () => {
  const supabase = useSupabaseClient()
  const authStore = useAuthStore()

  // ২. স্টেট ভেরিয়েবলসমূহ (State) [1.1]
  const deposits = ref<ManualDeposit[]>([])
  const pendingDeposits = ref<ManualDeposit[]>([])
  const isLoading = ref(false)

  // ৩. রিউজেবল অথেনটিকেশন হেডার জেনারেটর (৪০১ এরর এড়াতে) [1.1]
  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {}

    if (import.meta.server) {
      // সার্ভার সাইড রেন্ডারিংয়ের (SSR) সময় সেশন কুকি ফরওয়ার্ড করা হচ্ছে [1.1]
      const cookieHeader = useRequestHeaders(["cookie"]).cookie
      if (cookieHeader) {
        headers.cookie = cookieHeader
      }
    } else {
      // ক্লায়েন্ট-সাইডে রিয়েল-টাইম সেশন টোকেন নিয়ে Authorization হেডারে ইনজেক্ট করা হচ্ছে [1.1]
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
    }
    return headers
  }

  // ৪. অ্যাকশনসমূহ (Actions) [1.1]

  /**
   * ক. কাস্টমারের কারেন্ট ওয়ালেট ব্যালেন্স, ক্রেডিট এবং পেমেন্ট হিস্ট্রি রিড করা
   */
  const fetchBillingData = async () => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{
        success: boolean
        balance: string | number
        credits: number
        history: ManualDeposit[]
      }>("/api/billing", { headers })

      if (response) {
        deposits.value = response.history || []

        // গ্লোবাল useAuthStore এর ব্যালেন্স ও ক্রেডিট রিয়েল-টাইমে সিঙ্ক করা হচ্ছে [1.1]
        if (authStore.organization) {
          authStore.organization.walletBalance = response.balance
          authStore.organization.permanentCredit = response.credits // স্থায়ী ও বোনাস ক্রেডিট যোগফল
        }
      }
    } catch (error) {
      console.error("Error fetching billing data in store:", error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * খ. নতুন পেমেন্ট ডিপোজিট রিকোয়েস্ট সাবমিট করা
   */
  const submitDeposit = async (payload: {
    method: "BKASH" | "NAGAD" | "ROCKET"
    senderNumber: string
    transactionId: string
    amount: number
  }) => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean }>("/api/billing/deposit", {
        method: "POST",
        headers,
        body: payload,
      })

      // সফল সাবমিট শেষে লোকাল হিস্ট্রি এবং ব্যালেন্স রিফ্রেশ করা হচ্ছে
      await fetchBillingData()
      return response
    } catch (error) {
      console.error("Error submitting deposit request in store:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * গ. এডমিন প্যানেলের রিভিউ করার জন্য সমস্ত PENDING ডিপোজিট কুয়েরি করা (এডমিন কেবল)
   */
  const fetchAdminPending = async () => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean, data: ManualDeposit[] }>("/api/billing/admin/pending", { headers })

      if (response && response.data) {
        pendingDeposits.value = response.data
      }
    } catch (error) {
      console.error("Error fetching admin pending list in store:", error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * ঘ. এডমিন প্যানেল থেকে কোনো ট্রানজেকশন APPROVED বা সাকসেস করা (এডমিন কেবল)
   */
  const approveDeposit = async (id: string) => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean }>("/api/billing/admin/action", {
        method: "POST",
        headers,
        body: { id, action: "APPROVE" },
      })

      // লিস্ট থেকে ডিলিট বা রিফ্রেশ করা হচ্ছে
      await fetchAdminPending()
      return response
    } catch (error) {
      console.error("Error approving deposit in store:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * ঙ. এডমিন প্যানেল থেকে কোনো ট্রানজেকশন REJECTED বা বাতিল করা (এডমিন কেবল)
   */
  const rejectDeposit = async (id: string) => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean }>("/api/billing/admin/action", {
        method: "POST",
        headers,
        body: { id, action: "REJECT" },
      })

      // লিস্ট থেকে ডিলিট বা রিফ্রেশ করা হচ্ছে
      await fetchAdminPending()
      return response
    } catch (error) {
      console.error("Error rejecting deposit in store:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    deposits,
    pendingDeposits,
    isLoading,
    fetchBillingData,
    submitDeposit,
    fetchAdminPending,
    approveDeposit,
    rejectDeposit,
  }
})
