// server/api/billing/admin/action.post.ts
import { z } from "zod"
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../../repository/userRepository"
import { billingRepository } from "../../../repository/billingRepository"

// Zod স্কিমা: action ভ্যালু শুধুমাত্র APPROVE অথবা REJECT হবে
const actionSchema = z.object({
  id: z.string()
    .min(1, "Deposit ID is required")
    .uuid("Invalid deposit ID format"),
  action: z.enum(["APPROVE", "REJECT", "PENDING"],
    { error: "Action must be APPROVE or REJECT" })
})

export default defineEventHandler(async (event) => {
  try {
    const supabase = await serverSupabaseClient(event)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" })
    }

    const dbUser = await userRepository.findByEmail(supabaseUser.email)

    // রোল ভেরিফিকেশন (OWNER / ADMIN)
    if (!dbUser || (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN")) {
      throw createError({ statusCode: 403, statusMessage: "Forbidden: Admin access required" })
    }

    const body = await readBody(event)
    const validation = actionSchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: validation.error.format(),
      })
    }

    const { id, action } = validation.data

    // অ্যাকশন অনুযায়ী রেপোজিটরি মেথড কল করা (Prisma Transaction এর মাধ্যমে ব্যালেন্স আপডেট হবে)
    if (action === "APPROVE") {
      await billingRepository.approveDeposit(id)
    } else if (action === "REJECT") {
      await billingRepository.rejectDeposit(id)
    }

    return {
      success: true,
      message: `Deposit status updated successfully to ${action}`
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in POST /api/billing/admin/action:", error)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: "Internal Server Error" })
  }
})
