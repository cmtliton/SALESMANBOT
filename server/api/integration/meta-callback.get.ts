// server/api/integration/meta-callback.get.ts
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../repository/userRepository"
import { channelRepository } from "../../repository/channelRepository"

const config = useRuntimeConfig()
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string

  // যদি মেটা কোনো এরর পাঠায় বা ইউজার ক্যান্সেল করে
  if (query.error || !code) {
    return sendRedirect(event, "/dashboard/integration?sync=failed")
  }

  try {
    // ১. সেশন ভেরিফিকেশন (রিডাইরেক্টের সময় কুকি অটো-ফরওয়ার্ড হবে)
    const supabase = await serverSupabaseClient(event)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized: No active session found",
      })
    }

    const dbUser = await userRepository.findByEmail(supabaseUser.email)
    const orgId = dbUser?.organizationId

    if (!dbUser || !orgId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: User profile or workspace not found",
      })
    }

    const requestUrl = getRequestURL(event)

    // ২. ওথ কোড দিয়ে মেটা সার্ভার থেকে 'User Access Token' এক্সচেঞ্জ করা
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenResponse = await $fetch<any>("https://graph.facebook.com/v25.0/oauth/access_token", {
      query: {
        client_id: config.public.metaAppId, // আপনার মেটা অ্যাপ আইডি
        client_secret: config.metaAppSecret, // আপনার মেটা অ্যাপ সিক্রেট
        redirect_uri: `${requestUrl.origin}/api/integration/meta-callback`,
        code
      }
    })

    const userAccessToken = tokenResponse.access_token

    if (!userAccessToken) {
      throw new Error("Failed to retrieve user access token from Meta")
    }

    // ৩. 'User Access Token' ব্যবহার করে ওই ইউজারের অধীনে থাকা ফেসবুক পেজ এবং তাদের দীর্ঘমেয়াদী 'Page Access Token' তুলে আনা
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pagesResponse = await $fetch<any>("https://graph.facebook.com/v25.0/me/accounts", {
      query: {
        access_token: userAccessToken
      }
    })

    const pages = pagesResponse.data // পেজগুলোর তালিকা

    if (Array.isArray(pages) && pages.length > 0) {
      // ৪. প্রতিটি পেজকে আমাদের চ্যানেল রেপোজিটরির মাধ্যমে ডাটাবেস ও এআই সেটিংসের সাথে সিঙ্ক করা [1.1]
      for (const page of pages) {
        await channelRepository.upsertMessengerChannel(
          orgId,
          "MESSENGER",
          page.id,
          page.access_token,
          page.name
        )
      }
    }

    // ৫. সাকসেসফুল সিঙ্ক শেষে ইউজারকে ড্যাশবোর্ড ইন্টিগ্রেশন পেজে রিডাইরেক্ট করা হচ্ছে
    return sendRedirect(event, "/dashboard/integration?sync=success")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Meta OAuth Callback Error:", err)
    return sendRedirect(event, "/dashboard/integration?sync=error")
  }
})
