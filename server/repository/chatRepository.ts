// server/repository/chatRepository.ts
import { prisma } from "../utils/db"; // relative path to server/utils/db.ts [1.1]

export const chatRepository = {
  /**
   * ক. কাস্টমারের ফেসবুক/হোয়াটসঅ্যাপ আইডির ওপর ভিত্তি করে এক্টিভ সেশন খুঁজে বের করা বা নতুন সেশন ক্রিয়েট করা
   */
  async getOrCreateConversation(
    orgId: string,
    channelId: string,
    customerId: string,
    customerName?: string,
    customerPhone?: string,
  ) {
    // ডাটাবেসে ইতিমধ্যেই কাস্টমারের কোনো এক্টিভ চ্যাট সেশন আছে কিনা চেক করা হচ্ছে
    const existing = await prisma.conversation.findFirst({
      where: {
        customerId,
        channelId,
        organizationId: orgId,
        status: {
          in: ["ACTIVE", "PAUSED_BY_USER"],
        },
      },
    });

    if (existing) {
      // যদি কাস্টমারের নাম বা ফোন নম্বর আপডেট করার সুযোগ থাকে, তবে তা সিঙ্ক করা হচ্ছে
      if (
        (customerName && !existing.customerName) ||
        (customerPhone && !existing.customerPhone)
      ) {
        return await prisma.conversation.update({
          where: { id: existing.id },
          data: {
            customerName: customerName || existing.customerName,
            customerPhone: customerPhone || existing.customerPhone,
          },
        });
      }
      return existing;
    }

    // চ্যাট সেশন না থাকলে নতুন এক্টিভ কনভারসেশন তৈরি করা হচ্ছে
    return await prisma.conversation.create({
      data: {
        customerId,
        channelId,
        organizationId: orgId,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        status: "ACTIVE",
      },
    });
  },

  /**
   * খ. চ্যাটের প্রতিটি মেসেজ (কাস্টমার, হিউম্যান এজেন্ট বা এআই বটের পাঠানো) সেভ করা
   */
  async saveMessage(
    conversationId: string,
    senderType: "CUSTOMER" | "BOT" | "HUMAN",
    content: string,
    metadata?: { imageUrl?: string; videoUrl?: string; isAiReplied?: boolean },
  ) {
    return await prisma.message.create({
      data: {
        conversationId,
        senderType,
        content,
        imageUrl: metadata?.imageUrl || null,
        videoUrl: metadata?.videoUrl || null,
        isAiReplied: metadata?.isAiReplied || false,
      },
    });
  },

  /**
   * গ. চ্যাট অটোমেশন অন/অফ করা (হিউম্যান হ্যান্ডওভারের সময় বট পজ করতে এটি ব্যবহৃত হবে)
   */
  async toggleBotPause(conversationId: string, isPaused: boolean) {
    return await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: isPaused ? "PAUSED_BY_USER" : "ACTIVE",
      },
    });
  },

  /**
   * ঘ. এআই জেনারেটেড চ্যাটের সামারি বা মূল কনটেক্সট আপডেট করা
   */
  async updateConversationSummary(conversationId: string, summary: string) {
    return await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        summary,
      },
    });
  },
};
