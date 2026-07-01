// server/api/billing/index.get.ts
import { serverSupabaseClient } from '#supabase/server'
import { userRepository } from '../../repository/userRepository'
import { billingRepository } from '../../repository/billingRepository'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    // ১. সার্ভার-সাইড Supabase ইউজার সেশন ভেরিফিকেশন
    const supabase = await serverSupabaseClient(event)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: No active session found',
      })
    }

    // ২. ইমেইল দিয়ে ডাটাবেস থেকে ইউজারের organizationId খুঁজে বের করা
    const dbUser = await userRepository.findByEmail(supabaseUser.email)
    const orgId = dbUser?.organizationId

    if (!dbUser || !orgId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: User profile or workspace not found',
      })
    }

    // ৩. অর্গানাইজেশন টেবিল থেকে কারেন্ট ওয়ালেট ব্যালেন্স ও ক্রেডিট রিড করা
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { walletBalance: true, permanentCredit: true, bonusCredit: true }
    })

    if (!org) {
      throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
    }

    // ৪. বিলিং রেপোজিটরি থেকে ম্যানুয়াল ডিপোজিটের হিস্ট্রি তুলে আনা
    const deposits = await billingRepository.getDepositHistory(orgId)

    // ৫. সাকসেসফুল রেসপন্স রিটার্ন
    return {
      success: true,
      balance: org.walletBalance,
      credits: org.permanentCredit + org.bonusCredit,
      history: deposits
    }
  } catch (error: any) {
    console.error('Error in GET /api/billing:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error: Failed to fetch billing data'
    })
  }
})