// server/api/billing/deposit.post.ts
import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { userRepository } from '../../repository/userRepository'
import { billingRepository } from '../../repository/billingRepository'

// Zod স্কিমা দিয়ে ইনকামিং পেমেন্ট ডাটা ভ্যালিডেশন
const depositSchema = z.object({
  method: z.enum(['BKASH', 'NAGAD', 'ROCKET'], { required_error: 'Payment method is required' }),
  senderNumber: z.string().regex(/^(?:\+8801|01)[3-9]\d{8}$/, 'Must be a valid Bangladeshi phone number'),
  transactionId: z.string().trim().min(8, 'Transaction ID must be at least 8 characters').regex(/^[A-Z0-9]+$/, 'Transaction ID must be uppercase alphanumeric'),
  amount: z.number().min(100, 'Minimum deposit amount is 100 BDT').max(100000, 'Maximum deposit amount is 100,000 BDT')
})

export default defineEventHandler(async (event) => {
  try {
    const supabase = await serverSupabaseClient(event)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized: No active session found' })
    }

    const dbUser = await userRepository.findByEmail(supabaseUser.email)
    const orgId = dbUser?.organizationId

    if (!dbUser || !orgId) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request: User profile or workspace not found' })
    }

    // বডি রিড এবং Zod ভ্যালিডেশন
    const body = await readBody(event)
    const validation = depositSchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: validation.error.format(),
      })
    }

    const validatedData = validation.data

    // রেপোজিটরি কল করে পেন্ডিং ডিপোজিট রেকর্ড তৈরি করা (এখানে ডুপ্লিকেট TxID ভ্যালিডেশন হবে)
    await billingRepository.createPendingDeposit(orgId, validatedData)

    return {
      success: true,
      message: 'Deposit request submitted successfully. Waiting for admin approval.'
    }
  } catch (error: any) {
    console.error('Error in POST /api/billing/deposit:', error)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }
})