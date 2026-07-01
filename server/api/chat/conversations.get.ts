// server/api/chat/conversations.get.ts
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../repository/userRepository" // relative path [1.1]
import { prisma } from "../../utils/db" // relative path to database utility [1.1]

export default defineEventHandler(async (event) => {
  try {
    // ১. সার্ভার-সাইড Supabase ইউজার সেশন ভেরিফিকেশন (getUser API ব্যবহার করে)
    const supabase = await serverSupabaseClient(event)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized: No active session found",
      })
    }

    // ২. ইমেইল দিয়ে ডাটাবেস থেকে ইউজারের organizationId খুঁজে বের করা
    const dbUser = await userRepository.findByEmail(supabaseUser.email)
    const orgId = dbUser?.organizationId

    if (!dbUser || !orgId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: User profile or workspace not found",
      })
    }

    // ৩. নির্দিষ্ট organizationId-এর অধীনে থাকা সমস্ত ACTIVE এবং PAUSED_BY_USER কনভারসেশন খুঁজে বের করা
    const conversations = await prisma.conversation.findMany({
      where: {
        organizationId: orgId,
        status: {
          in: ["ACTIVE", "PAUSED_BY_USER"]
        }
      },
      orderBy: {
        updatedAt: "desc" // সবচেয়ে নতুন মেসেজ সংবলিত চ্যাট পেজটি ইনবক্সের সবার ওপরে থাকবে
      }
    })

    // ৪. সাকসেসফুল রেসপন্স রিটার্ন
    return {
      success: true,
      data: conversations
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in GET /api/chat/conversations:", error)

    // কাস্টম H3 Error হলে সরাসরি রি-থ্রো করা হচ্ছে
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: Failed to fetch conversations"
    })
  }
})
