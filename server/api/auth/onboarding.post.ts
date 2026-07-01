// server/api/auth/onboarding.post.ts
import { serverSupabaseClient } from "#supabase/server"
import { prisma } from "../../utils/db"

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  // ডিফেন্সিভ আইডি এক্সট্রাকশন
  const {
    data: { user: supabaseUser },
    error
  } = await supabase.auth.getUser()
  if (error || !supabaseUser || !supabaseUser.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized: No active session or valid user ID found"
    })
  }

  const body = await readBody(event)
  const businessName = body?.businessName

  if (!businessName || typeof businessName !== "string" || !businessName.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request: Workspace or Business name is required"
    })
  }

  try {
    const transactionResult = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: supabaseUser.email! },
        select: { id: true, organizationId: true }
      })

      if (existingUser?.organizationId) {
        throw createError({
          statusCode: 400,
          statusMessage: "Conflict: User is already onboarded and belongs to an organization"
        })
      }

      const newOrg = await tx.organization.create({
        data: {
          name: businessName.trim(),
          walletBalance: 0.00,
          bonusCredit: 0,
          permanentCredit: 0,
          dailyQuotaLimit: 500
        }
      })

      // মেটাডেটা অবজেক্টের উৎস নির্ধারণ (সেশন বনাম ইউজার)
      const userObj = supabaseUser
      const fullName = userObj.user_metadata?.full_name || null
      const phoneNumber = userObj.user_metadata?.phone_number || null
      const email = userObj.email || null

      const userRecord = await tx.user.upsert({
        where: { id: supabaseUser.id },
        create: {
          id: supabaseUser.id,
          email: email!,
          name: fullName,
          phoneNumber: phoneNumber,
          role: "OWNER",
          organizationId: newOrg.id
        },
        update: {
          email: email!,
          name: fullName,
          phoneNumber: phoneNumber,
          role: "OWNER",
          organizationId: newOrg.id
        }
      })

      return {
        organization: newOrg,
        user: userRecord
      }
    })

    return {
      success: true,
      message: "Workspace and owner profile initialized successfully",
      data: {
        organization: transactionResult.organization
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Onboarding Server Error:", error)

    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: Failed to complete onboarding setup",
      data: error.message
    })
  }
})
