// server/api/billing/admin/pending.get.ts
import { serverSupabaseClient } from '#supabase/server'
import { userRepository } from '../../../repository/userRepository' // ৩ স্তর উপরে
import { billingRepository } from '../../../repository/billingRepository' // ৩ স্তর উপরে

export default defineEventHandler(async (event) => {
  try {
    const supabase = await serverSupabaseClient(event)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const dbUser = await userRepository.findByEmail(supabaseUser.email)

    // রোল বেসড এক্সেস কন্ট্রোল (RBAC): শুধুমাত্র OWNER বা ADMIN রাই দেখতে পারবেন
    if (!dbUser || (dbUser.role !== 'OWNER' && dbUser.role !== 'ADMIN')) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' })
    }

    // সুপার-এডমিন রিভিউর জন্য সমস্ত অর্গানাইজেশনের পেন্ডিং ডিপোজিট কুয়েরি করা
    const pendingDeposits = await billingRepository.getAdminPendingDeposits()

    return {
      success: true,
      data: pendingDeposits
    }
  } catch (error: any) {
    console.error('Error in GET /api/billing/admin/pending:', error)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }
})