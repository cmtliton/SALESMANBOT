// server/api/integration/index.get.ts
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../repository/userRepository" // relative path [1.1]
import { channelRepository } from "../../repository/channelRepository" // relative path [1.1]

export default defineEventHandler(async (event) => {
  try {
    // ক. সার্ভার-সাইড Supabase ইউজার সেশন ভেরিফিকেশন (getUser API ব্যবহার করে)
    const supabase = await serverSupabaseClient(event)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized: No active session found",
      })
    }

    // খ. ইমেইল দিয়ে ডাটাবেস থেকে ইউজারের organizationId খুঁজে বের করা
    const dbUser = await userRepository.findByEmail(supabaseUser.email)
    const orgId = dbUser?.organizationId

    if (!dbUser || !orgId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: User profile or workspace not found",
      })
    }

    // গ. রেপোজিটরি ব্যবহার করে ওই ওয়ার্কস্পেসের সমস্ত কানেক্টেড চ্যানেল রিড করা
    const channels = await channelRepository.getChannelsByOrg(orgId)

    return {
      success: true,
      data: channels,
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in GET /api/integration:", error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    })
  }
})
