// server/api/settings/ai/index.post.ts
import { z } from "zod"
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../../repository/userRepository" // ৪ স্তর উপরে [1.1]
import { aiSettingsRepository } from "../../../repository/aiSettingsRepository" // ৪ স্তর উপরে [1.1]
import { AIProvider } from "../../../../prisma/generated/client" // টাইপ-সেফ ইন্টারফেস ইম্পোর্ট করা

// Zod স্কিমা দিয়ে এআই সেটিংসের সমস্ত ভ্যালু কঠোরভাবে ভ্যালিডেশন করা হচ্ছে [1.1]
const aiSettingsSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"), // .uuid("Invalid channel ID"),

  // z.nativeEnum() deprecated → use z.enum() for TS enums
  provider: z.enum(AIProvider),

  modelName: z.string().min(1, "Model name is required").trim(),

  // allow: undefined | null | "" | trimmed string
  customApiKey: z.string().trim().nullable().optional().or(z.literal("")),

  // NOTE: removed .uuid() because prompts are usually free text
  systemPrompt: z.string().min(1, "System prompt is required").trim(),

  imagePrompt: z.string().trim().nullable().optional().or(z.literal("")),

  smartReplyDelay: z.number().min(0).max(60),
  memoryContextLimit: z.number().min(1).max(50),
  creativity: z.number().min(0).max(1),
  diversity: z.number().min(0).max(1),

  semanticCacheEnabled: z.boolean(),
  embeddingEnabled: z.boolean(),
  proPlusMode: z.boolean(),
  orderEmailNotifications: z.boolean(),

  notificationEmail: z
    .string()
    .trim()
    .email("Invalid email format")
    .nullable()
    .optional()
    .or(z.literal("")),
});

export default defineEventHandler(async (event) => {
  try {
    // ক. সেশন ও ওনারশিপ ভেরিফিকেশন
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

    // খ. Zod ভ্যালিডেশন [1.1]
    const body = await readBody(event)
    const validation = aiSettingsSchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: validation.error.format(),
      })
    }

    const { channelId, ...validatedData } = validation.data
    // গ. ফাঁকা স্ট্রিংগুলোকে ডাটাবেস ফ্রেন্ডলি 'null' ভ্যালুতে রূপান্তর করা হচ্ছে
    const payload = {
      ...validatedData,
      customApiKey: validatedData.customApiKey || null,
      imagePrompt: validatedData.imagePrompt || null,
      notificationEmail: validatedData.notificationEmail || null
    }

    // ঘ. রেপোজিটরি কল করে ওনারশিপ চেক সহ এআই সেটিংস আপডেট করা [1.1]
    const updatedSettings = await aiSettingsRepository.updateSettings(channelId, orgId, payload)

    return {
      success: true,
      message: "AI configuration updated successfully",
      data: updatedSettings,
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in POST /api/settings/ai:", error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: Failed to save AI configurations",
    })
  }
})
