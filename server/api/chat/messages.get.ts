// server/api/chat/messages.get.ts
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../repository/userRepository" // relative path [1.1]
import { prisma } from "../../utils/db" // relative path to server/utils/db.ts [1.1]

export default defineEventHandler(async (event) => {
  try {
    // ১. সার্ভার-সাইড Supabase ইউজার সেশন ভেরিফিকেশন
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

    // ৩. কুয়েরি প্যারামিটার থেকে conversationId নেওয়া এবং ভ্যালিডেশন
    const query = getQuery(event)
    const conversationId = query.conversationId as string

    if (!conversationId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: conversationId query parameter is required",
      })
    }

    // ৪. মেসেজ হিস্ট্রি কুয়েরি করা (মাল্টি-টেন্যান্ট সিকিউরিটি এবং ক্রোহনোলজিক্যাল সর্টিং সহ)
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        // নিরাপত্তা নিশ্চিতকরণ: মেসেজগুলোর কনভারসেশনটি অবশ্যই এই ইউজারের অর্গানাইজেশনের হতে হবে
        conversation: {
          organizationId: orgId
        }
      },
      orderBy: {
        createdAt: "asc" // পুরোনো মেসেজ ওপরে (top) এবং নতুন মেসেজ নিচে (bottom) থাকবে
      }
    })

    // ৫. সাকসেসফুল রেসপন্স রিটার্ন
    return {
      success: true,
      data: messages
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in GET /api/chat/messages:", error)

    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: Failed to fetch message history"
    })
  }
})
