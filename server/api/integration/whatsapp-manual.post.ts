// server/api/integration/whatsapp-manual.post.ts
import { z } from "zod"
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../repository/userRepository"
import { channelRepository } from "../../repository/channelRepository"

const whatsappSchema = z.object({
  phoneId: z.string().trim().min(1, "Phone Number ID is required"),
  accountId: z.string().trim().min(1, "Business Account ID is required"),
  accessToken: z.string().trim().min(1, "Access Token is required"),
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
    const validation = whatsappSchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: validation.error.format(),
      })
    }

    const { phoneId, accountId, accessToken } = validation.data

    // গ. হোয়াটসঅ্যাপ ক্লাউড চ্যানেল রেপোজিটরিতে সেভ করা
    const channel = await channelRepository.upsertWhatsAppChannel(
      orgId,
      phoneId,
      accountId,
      accessToken
    )

    return {
      success: true,
      data: channel,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in POST /api/integration/whatsapp-manual:", error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    })
  }
})
