// server/repository/aiSettingsRepository.ts
import type { Prisma } from "../../prisma/generated/client"
import { prisma } from "../utils/db" // server/utils/db.ts এর আপেক্ষিক পাথ অনুযায়ী [1.1]

export const aiSettingsRepository = {
  /**
   * ১. নির্দিষ্ট চ্যানেলের এআই সেটিংস রিড করা (ওনারশিপ ভেরিফিকেশন সহ)
   */
  async getSettingsByChannel(channelId: string, orgId: string) {
    // কাস্টমারের অর্গানাইজেশনের সাথে চ্যানেল আইডিটি ম্যাচ করে কিনা তা ভেরিফাই করা হচ্ছে [1.1]
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        organizationId: orgId,
      },
    })

    // ওনারশিপ ম্যাচ না করলে এক্সেস রিজেক্ট করা হবে [1.1]
    if (!channel) {
      throw createError({
        statusCode: 403,
        statusMessage: "Unauthorized: Channel not found or access denied for this workspace",
      })
    }

    // ভেরিফাইড হলে এআই সেটিংস রিটার্ন করা হচ্ছে [1.1]
    return await prisma.aISettings.findUnique({
      where: {
        channelId,
      },
    })
  },

  /**
   * ২. নির্দিষ্ট চ্যানেলের এআই সেটিংস আপডেট করা (ওনারশিপ ভেরিফিকেশন সহ)
   */
  async updateSettings(channelId: string, orgId: string, data: Prisma.AISettingsUpdateInput) {
    // ডাটা সেভ বা আপডেট করার পূর্বে ওনারশিপ ভেরিফাই করা হচ্ছে [1.1]
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        organizationId: orgId,
      },
    })

    if (!channel) {
      throw createError({
        statusCode: 403,
        statusMessage: "Unauthorized: Channel not found or access denied for this workspace",
      })
    }

    // ওনারশিপ নিশ্চিত হওয়ার পর এআই সেটিংস আপডেট করা হচ্ছে [1.1]
    return await prisma.aISettings.update({
      where: {
        channelId,
      },
      data,
    })
  },
}
