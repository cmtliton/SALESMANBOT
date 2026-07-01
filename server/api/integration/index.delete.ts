// server/api/integration/index.delete.ts
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../repository/userRepository"
import { channelRepository } from "../../repository/channelRepository"

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

    // খ. কোয়েরি প্যারামিটার থেকে চ্যানেল আইডি এক্সট্রাক্ট করা
    const query = getQuery(event)
    const channelId = query.id as string

    if (!channelId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: Channel ID is required",
      })
    }

    // গ. ওনারশিপ নিশ্চিত করে চ্যানেল ডিসকানেক্ট করা
    await channelRepository.disconnectChannel(channelId, orgId)

    return {
      success: true,
      message: "Channel disconnected successfully",
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in DELETE /api/integration:", error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    })
  }
})
