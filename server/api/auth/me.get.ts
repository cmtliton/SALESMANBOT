// server/api/auth/me.get.ts
import { serverSupabaseClient } from "#supabase/server"
import { prisma } from "../../utils/db"

export default defineEventHandler(async (event) => {
  try {
    // ১. সার্ভার-সাইড ইভেন্ট থেকে Supabase সেশন রিড করা হচ্ছে
    const supabase = await serverSupabaseClient(event)
    const {
      data: { user: supabaseUser },
      error
    } = await supabase.auth.getUser()
    // ২. ডিফেন্সিভ আইডি এক্সট্রাকশন (ইউজার অবজেক্ট বা সেশন র্যাপার—উভয় ক্ষেত্র থেকেই আইডি বের করবে)
    // যদি কোনো সেশন বা ভ্যালিড ইউজার আইডি না পাওয়া যায়, তবে ৪০১ (Unauthorized) এরর থ্রো করবে
    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized: No active session or valid user ID found" })
    }

    // ৩. Supabase ইউজারের UUID (id) দিয়ে আমাদের PostgreSQL database-এর User টেবিলে কুয়েরি করা হচ্ছে
    const dbUser = await prisma.user.findUnique({
      where: {
        email: supabaseUser.email
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        organization: true
      }
    })

    // ৪. ইউজার অনবোর্ডিং কমপ্লিট করেছে কিনা (অর্থাৎ organizationId আছে কিনা) তা চেক করা হচ্ছে
    const hasOrg = !!dbUser?.organizationId

    // ৫. রিকোয়ার্ড ফরম্যাট অনুযায়ী JSON রেসপন্স রিটার্ন করা হচ্ছে
    return {
      isAuthenticated: true,
      hasOrg,
      user: dbUser
        ? {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
            organizationId: dbUser.organizationId,
            organization: dbUser.organization
          }
        : null // ইউজার যদি শুধু Supabase-এ রেজিস্টার্ড হয় কিন্তু অনবোর্ডিং না করে থাকে, তবে ইউজার অবজেক্ট null যাবে
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error fetching user auth status in me.get.ts:", error)

    // যদি এটি আমাদের থ্রো করা কাস্টম H3 Error (যেমন ৪০১) হয়, তবে সেটি হুবহু রি-থ্রো করা হবে
    if (error.statusCode) throw error

    // অন্য কোনো অপ্রত্যাশিত ডাটাবেস এরর হলে ৫০০ এরর হ্যান্ডলিং
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: Failed to fetch auth status"
    })
  }
})
