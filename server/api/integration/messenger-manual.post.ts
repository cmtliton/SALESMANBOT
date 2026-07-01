// server/api/integration/messenger-manual.post.ts
import { z } from "zod"
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../repository/userRepository"
import { channelRepository } from "../../repository/channelRepository"

// Zod স্কিমা দিয়ে ইনপুট স্যানিটাইজেশন
const messengerSchema = z.object({
  pageName: z.string().trim().min(1, "Page name is required"),
  pageId: z.string().trim().min(1, "Page ID is required"),
  pageAccessToken: z.string().trim().min(1, "Access Token is required"),
})

export default defineEventHandler(async (event) => {
  try {
    // ক. সেশন ও ওনারশিপ চেক
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

    // খ. Zod ভ্যালিডেশন
    const body = await readBody(event)
    const validation = messengerSchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: validation.error.format(),
      })
    }

    const { pageName, pageId, pageAccessToken } = validation.data

    // গ. রেপোজিটরি কল করে ট্রানজেকশনের মাধ্যমে সেভ ও এআই সেটিংস ইনিশিয়ালাইজেশন
    const channel = await channelRepository.upsertMessengerChannel(
      orgId,
      "MESSENGER",
      pageId,
      pageAccessToken,
      pageName
    )

    return {
      success: true,
      data: channel,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in POST /api/integration/messenger-manual:", error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    })
  }
})
