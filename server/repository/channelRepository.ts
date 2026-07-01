// server/repository/channelRepository.ts
import { prisma } from "../utils/db" // server/utils/db.ts এর আপেক্ষিক পাথ অনুযায়ী [1.1]

export const channelRepository = {
  /**
   * ১. নির্দিষ্ট অর্গানাইজেশনের সমস্ত কানেক্টেড চ্যানেল রিড করা
   */
  async getChannelsByOrg(orgId: string) {
    return await prisma.channel.findMany({
      where: {
        organizationId: orgId,
      },
      include: {
        aiSettings: true, // এআই সেটিংস ডেটাও একসাথে রিড করার জন্য
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  },

  /**
   * ২. ফেসবুক মেসেঞ্জার বা ইনস্টাগ্রাম চ্যানেল কানেক্ট বা আপডেট করা (Prisma Transaction)
   */
  async upsertMessengerChannel(
    orgId: string,
    platform: "MESSENGER" | "INSTAGRAM",
    pageId: string,
    pageAccessToken: string,
    pageName?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // ক. চ্যানেল টেবিলে ডাটা Upsert করা ( pageId কে প্রাইমারি আইডি হিসেবে ব্যবহার করা হয়েছে)
      const channel = await tx.channel.upsert({
        where: { id: pageId },
        create: {
          id: pageId,
          platform,
          status: "ACTIVE",
          pageId,
          pageAccessToken,
          organizationId: orgId,
        },
        update: {
          status: "ACTIVE",
          pageAccessToken,
          organizationId: orgId, // ওনারশিপ সিঙ্ক নিশ্চিত করা হচ্ছে
        },
      })

      // খ. চ্যানেলের জন্য ডিফল্ট এআই প্রম্পট ও সেটিংস ইনিশিয়ালাইজ করা
      await tx.aISettings.upsert({
        where: { channelId: channel.id },
        create: {
          channelId: channel.id,
          provider: "OLLAMA", // লোকাল ডেভেলপমেন্ট টেস্টিংয়ের জন্য ওল্লামা ডিফল্ট
          modelName: "llama3.2",
          systemPrompt: `You are a professional sales representative for ${pageName || "our business"}. Politely answer customer inquiries.`,
          smartReplyDelay: 5,
          memoryContextLimit: 10,
          creativity: 0.7,
          diversity: 0.9,
          semanticCacheEnabled: true,
          embeddingEnabled: true,
        },
        update: {}, // অলরেডি প্রম্পট বা কনফিগ সেট করা থাকলে সেটি ওভাররাইট করবে না
      })

      return channel
    })
  },

  /**
   * ৩. হোয়াটসঅ্যাপ ক্লাউড এপিআই চ্যানেল কানেক্ট বা আপডেট করা (Prisma Transaction)
   */
  async upsertWhatsAppChannel(
    orgId: string,
    phoneId: string,
    accountId: string,
    accessToken: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // ক. হোয়াটসঅ্যাপ চ্যানেল ডাটা Upsert করা
      const channel = await tx.channel.upsert({
        where: { id: phoneId },
        create: {
          id: phoneId,
          platform: "WHATSAPP",
          status: "ACTIVE",
          whatsAppPhoneId: phoneId,
          whatsAppAccountId: accountId,
          whatsAppAccessToken: accessToken,
          organizationId: orgId,
        },
        update: {
          status: "ACTIVE",
          whatsAppPhoneId: phoneId,
          whatsAppAccountId: accountId,
          whatsAppAccessToken: accessToken,
          organizationId: orgId,
        },
      })

      // খ. হোয়াটসঅ্যাপের জন্য উপযোগী সংক্ষিপ্ত এবং ডায়রেক্ট সিস্টেম প্রম্পট ইনিশিয়ালাইজ করা
      await tx.aISettings.upsert({
        where: { channelId: channel.id },
        create: {
          channelId: channel.id,
          provider: "OLLAMA",
          modelName: "llama3.2",
          systemPrompt: "You are a professional WhatsApp sales assistant. Keep your responses short, structured, and helpful.",
          smartReplyDelay: 5,
          memoryContextLimit: 10,
          creativity: 0.7,
          diversity: 0.9,
          semanticCacheEnabled: true,
          embeddingEnabled: true,
        },
        update: {},
      })

      return channel
    })
  },

  /**
   * ৪. একটি চ্যানেল ডিসকানেক্ট বা ডিঅ্যাক্টিভেট করা (সিকিউরিটি ও ওনারশিপ চেক সহ)
   */
  async disconnectChannel(channelId: string, orgId: string) {
    // মাল্টি-টেন্যান্ট ওনারশিপ ভেরিফাই করা হচ্ছে
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        organizationId: orgId,
      },
    })

    if (!channel) {
      throw createError({
        statusCode: 403,
        statusMessage: "Unauthorized: Channel not found or access denied",
      })
    }

    // চ্যানেলটি ডিলিট করার পরিবর্তে স্ট্যাটাস INACTIVE করে দেওয়া হচ্ছে
    return await prisma.channel.update({
      where: { id: channelId },
      data: {
        status: "INACTIVE",
      },
    })
  },
}
