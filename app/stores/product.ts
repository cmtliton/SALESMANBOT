// app/store/product.ts
import { defineStore } from "pinia"
import { ref } from "vue"

// ১. প্রোডাক্ট ডাটার জন্য টাইপ-সেফ ইন্টারফেস ডিফাইন করা
export interface Product {
  id: string
  title: string
  description: string
  allowDescriptionInChat: boolean
  aiKeywords: string[]
  isCombo: boolean
  price: number | string
  currency: string
  stock: number
  images: string[]
  videoUrl?: string | null
  wooCommerceId?: number | null
  isVariable: boolean
  visibleOnChannels: string[]
  createdAt: string
  updatedAt: string
  organizationId: string
}

export const useProductStore = defineStore("product", () => {
  const supabase = useSupabaseClient()

  // ২. স্টেট ভেরিয়েবলসমূহ (State)
  const products = ref<Product[]>([])
  const selectedProduct = ref<Product | null>(null)
  const isLoading = ref(false)
  const isSyncing = ref(false)

  // ৩. ডমেস্টিক হেল্পার ফাংশন (অথেনটিকেশন হেডার ফরওয়ার্ডিংয়ের জন্য)
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
      const {
        data: { session }
      } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
    }
    return headers
  }

  // ৪. অ্যাকশনসমূহ (Actions)

  /**
   * ক. অর্গানাইজেশনের সমস্ত প্রোডাক্ট এপিআই থেকে রিড করা
   */
  const fetchProducts = async () => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean, data: Product[] }>(
        "/api/products",
        { headers }
      )

      if (response && response.data) {
        products.value = response.data
      }
    } catch (error) {
      console.error("Error fetching products in store:", error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * খ. নতুন প্রোডাক্ট ম্যানুয়ালি যুক্ত করা (পে-লোড সরাসরি এপিআইতে পাঠানো হচ্ছে)
   */
  const addProduct = async (
    payload: Omit<Product, "id" | "createdAt" | "updatedAt" | "organizationId">
  ) => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{ success: boolean, data: Product }>(
        "/api/products",
        {
          method: "POST",
          headers,
          body: payload
        }
      )
      if (response && response.data) {
        // নতুন যুক্ত করা প্রোডাক্টটিকে লোকাল স্টেটের সবার উপরে (Prepend) যুক্ত করা হলো
        products.value.unshift(response.data)
      }
      return response
    } catch (error) {
      console.error("Error adding product in store:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * গ. WooCommerce থেকে প্রোডাক্ট ইমপোর্ট/সিঙ্ক ট্রিগার করা
   */
  const importWooCommerce = async (credentials: {
    storeUrl: string
    consumerKey: string
    consumerSecret: string
  }) => {
    isSyncing.value = true
    try {
      const headers = await getAuthHeaders()
      const response = await $fetch<{
        success: boolean
        importedCount: number
      }>("/api/products/import-woo", {
        method: "POST",
        headers,
        body: credentials
      })

      // সিঙ্ক সম্পূর্ণ হওয়ার পর লোকাল প্রোডাক্ট লিস্টটি রিফ্রেশ করা হচ্ছে
      await fetchProducts()
      return response
    } catch (error) {
      console.error("Error importing WooCommerce products:", error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * ঘ. ডাটাবেস থেকে এবং লোকাল স্টেট থেকে প্রোডাক্ট ডিলিট করা
   */
  const deleteProduct = async (id: string) => {
    isLoading.value = true
    try {
      const headers = await getAuthHeaders()
      await $fetch("/api/products", {
        method: "DELETE",
        headers,
        query: { id }
      })

      // সফলভাবে ডিলিট হওয়ার পর লোকাল স্টোরের অ্যারে থেকে ফিল্টার করে ফেলে দেওয়া হচ্ছে
      products.value = products.value.filter(p => p.id !== id)
    } catch (error) {
      console.error("Error deleting product in store:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    products,
    selectedProduct,
    isLoading,
    isSyncing,
    fetchProducts,
    addProduct,
    importWooCommerce,
    deleteProduct
  }
})
