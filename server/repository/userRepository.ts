// server/repository/userRepository.ts
import { prisma } from "../utils/db"

export const userRepository = {
  // ইমেইল দিয়ে ইউজার এবং অর্গানাইজেশন কুয়েরি করা
  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        organization: true // রিলেশন ইনক্লুড করা হলো
      }
    })
  },

  // ইউজার ও অর্গানাইজেশন একই সাথে আপসার্ট (Upsert) করা (অনবোর্ডিংয়ের জন্য)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async upsertOnboardingUser(userId: string, email: string, name: string | null, phoneNumber: string | null, orgId: string, tx: any) {
    // এখানে tx অবজেক্ট পাস করা হয়েছে যাতে ট্রানজেকশনের ভেতরে এটি এক্সিকিউট হতে পারে
    return await tx.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        name,
        phoneNumber,
        role: "OWNER",
        organizationId: orgId
      },
      update: {
        email,
        name,
        phoneNumber,
        role: "OWNER",
        organizationId: orgId
      }
    })
  }
}
