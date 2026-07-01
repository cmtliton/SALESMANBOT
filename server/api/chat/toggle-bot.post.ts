// server/api/chat/toggle-bot.post.ts
import { z } from "zod"
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../repository/userRepository" // relative path [1.1]
import { chatRepository } from "../../repository/chatRepository" // relative path [1.1]
import { prisma } from "../../utils/db" // relative path to database utility [1.1]

// ১. Zod স্কিমা দিয়ে ইনকামিং ডাটা ভ্যালিডেশন [1.1]
const toggleSchema = z.object({
  conversationId: z.string("Conversation ID is required").uuid("Invalid conversation ID"),
  isPaused: z.boolean("isPaused boolean is required")
})

export default defineEventHandler(async (event) => {
  try {
    // ২. সার্ভার-সাইড Supabase ইউজার সেশন ভেরিফিকেশন
    const supabase = await serverSupabaseClient(event)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized: No active session found",
      })
    }

    // ৩. ইমেইল দিয়ে ডাটাবেস থেকে ইউজারের organizationId খুঁজে বের করা
    const dbUser = await userRepository.findByEmail(supabaseUser.email)
    const orgId = dbUser?.organizationId

    if (!dbUser || !orgId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: User profile or workspace not found",
      })
    }

    // ৪. Zod ভ্যালিডেশন [1.1]
    const body = await readBody(event)
    const validation = toggleSchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: validation.error.format(),
      })
    }

    const { conversationId, isPaused } = validation.data

    // ৫. সিকিউরিটি চেক: কনভারসেশনটি আসলেই ইউজারের অর্গানাইজেশনের কিনা তা যাচাই করা [1.1]
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: orgId
      }
    })

    if (!conversation) {
      throw createError({
        statusCode: 403,
        statusMessage: "Forbidden: Conversation not found or access denied for this workspace",
      })
    }

    // ৬. রেপোজিটরি কল করে চ্যাট অটোমেশন স্ট্যাটাস টগল করা (ACTIVE <-> PAUSED_BY_USER) [1.1]
    await chatRepository.toggleBotPause(conversationId, isPaused)

    // ৭. সফল রেসপন্স রিটার্ন [1.1]
    return {
      success: true,
      message: "Bot automation status updated successfully"
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in POST /api/chat/toggle-bot:", error)

    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: Failed to toggle bot status"
    })
  }
})
