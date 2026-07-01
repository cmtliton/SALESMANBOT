// app/middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  const isLoggedIn = !!user.value

  // পাবলিক রুটস
  const publicRoutes = ["/login", "/register", "/forgot-password", "/confirm", "/reset-password"]
  const isPublic = publicRoutes.includes(to.path)

  // ১. ইউজার লগইন করা না থাকলে
  if (!isLoggedIn) {
    if (!isPublic) {
      return navigateTo("/login")
    }
    return
  }

  // ২. ইউজার লগইন করা থাকলে
  try {
    const headers: Record<string, string> = {}

    if (import.meta.server) {
      // সার্ভার-সাইডে রান করার সময় ইনকামিং কুকি হেডারটি পাস করে দেওয়া হচ্ছে
      const cookieHeader = useRequestHeaders(["cookie"]).cookie
      if (cookieHeader) {
        headers.cookie = cookieHeader
      }
    } else {
      // ক্লায়েন্ট-সাইডে রান করার সময় সরাসরি সেশন টোকেনটি Authorization হেডারে পাঠানো হচ্ছে
      // এর ফলে কুকি সিঙ্ক হওয়ার বিলম্বজনিত ৪০১ (Unauthorized) এরর চিরতরে সমাধান হয়ে যাবে
      const client = useSupabaseClient()
      const { data: { session } } = await client.auth.getSession()

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
    }

    // এপিআই কল করা হচ্ছে নতুন হেডার সহ
    const data = await $fetch<{ hasOrg: boolean }>("/api/auth/me", { headers })
    const hasOrg = data.hasOrg

    if (!hasOrg) {
      // অনবোর্ডিং বাকি থাকলে অনবোর্ডিং পেজে আটকে রাখা হবে
      if (to.path !== "/onboarding") {
        return navigateTo("/onboarding")
      }
    } else {
      // অনবোর্ডিং করা থাকলে অনবোর্ডিং পেজ বা লগইন পেজে যেতে দেওয়া হবে না
      if (to.path === "/onboarding") {
        return navigateTo("/dashboard")
      }
      if (to.path === "/login" || to.path === "/register") {
        return navigateTo("/dashboard")
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in auth global middleware:", error)

    // কোনো কারণে সেশন একবারে নষ্ট বা অবৈধ হয়ে গেলে লগইন পেজে রিডাইরেক্ট করবে
    return navigateTo("/login")
  }
})
