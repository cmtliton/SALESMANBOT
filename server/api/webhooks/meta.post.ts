// server/api/webhooks/meta.post.ts
import { processAgentResponse } from "../../utils/agent-orchestrator"
import { prisma } from "../../utils/db"
import { chatRepository } from "../../repository/chatRepository"

// Declaration for the background agent processor. Implemented elsewhere.
// declare function processAgentResponse(conversationId: string, organizationId: string, message: string): Promise<void>

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // মেটা-কে ইনস্ট্যান্ট ২০০ ওকে রেসপন্স পাঠানোর হেল্পার ফাংশন
  // এটি রিট্রাই লুপ এবং ডুপ্লিকেট মেসেজ আসা চিরতরে বন্ধ করবে
  const respondOk = () => {
    setResponseStatus(event, 200)
    return { success: true }
  }

  if (!body || !body.object) {
    return respondOk()
  }
  let platform: "WHATSAPP" | "MESSENGER" | null = null
  let recipientId = "" // পেজ আইডি অথবা হোয়াটসঅ্যাপ ফোন আইডি
  let senderId = "" // কাস্টমার ফোন নম্বর অথবা ফেসবুক স্কোপড আইডি
  let senderName = ""
  let messageContent = ""
  let imageUrl: string | undefined = undefined

  // ১. মেটা প্ল্যাটফর্ম ডিটেক্ট করা এবং পেলোড পার্স করা
  if (body.object === "whatsapp_business_account") {
    platform = "WHATSAPP"
    const change = body.entry?.[0]?.changes?.[0]?.value
    if (!change || !change.messages || change.messages.length === 0) {
      return respondOk()
    }

    recipientId = change.metadata?.phone_number_id
    const message = change.messages[0]
    senderId = message.from
    senderName = change.contacts?.[0]?.profile?.name || ""

    // মেসেজের ধরন চেক করা (হোয়াটসঅ্যাপ টেক্সট বনাম মিডিয়া)
    if (message.type === "text") {
      messageContent = message.text?.body || ""
    } else if (message.type === "image") {
      messageContent = "[Sent an Image]"
      imageUrl = message.image?.id // হোয়াটসঅ্যাপ ইমেজ মিডিয়া আইডি
    }
  } else if (body.object === "page") {
    platform = "MESSENGER"
    const messaging = body.entry?.[0]?.messaging?.[0]
    if (!messaging || !messaging.message) {
      return respondOk()
    }

    recipientId = messaging.recipient?.id
    senderId = messaging.sender?.id
    senderName = "" // ফেসবুক সরাসরি ওয়েবহুকে ইউজারের নাম পাঠায় না

    // মেসেঞ্জারের টেক্সট বনাম মিডিয়া চেক
    if (messaging.message.text) {
      messageContent = messaging.message.text
    } else if (messaging.message.attachments) {
      const attachment = messaging.message.attachments[0]
      if (attachment.type === "image") {
        messageContent = "[Sent an Image]"
        imageUrl = attachment.payload?.url // সরাসরি CDN ইমেজ লিংক
      }
    }
  }

  if (!platform || !recipientId || !senderId) {
    return respondOk()
  }

  // ২. ডাটাবেস থেকে সংশ্লিষ্ট এক্টিভ চ্যানেলটি খুঁজে বের করা
  const channel = await prisma.channel.findFirst({
    where: {
      platform,
      OR: [
        { whatsAppPhoneId: recipientId },
        { pageId: recipientId }
      ],
      status: "ACTIVE"
    }
  })

  if (!channel) {
    console.error(`No active channel found for Meta Recipient ID: ${recipientId} on platform: ${platform}`)
    return respondOk()
  }

  // ৩. চ্যাট কনভারসেশন লগ করা এবং মেসেজ সেভ করা
  try {
    const conversation = await chatRepository.getOrCreateConversation(
      channel.organizationId,
      channel.id,
      senderId,
      senderName || undefined
    )

    // কাস্টমারের মেসেজ ডাটাবেসে সেভ করা হচ্ছে [1.1]
    await chatRepository.saveMessage(conversation.id, "CUSTOMER", messageContent, { imageUrl })

    // ৪. ব্যাকগ্রাউন্ডে এআই এজেন্ট ট্রিগার করা (ফায়ার-অ্যান্ড-ফরগেট)
    // আমরা প্রমিজটি 'await' করব না, যাতে মেটাকে ৩ সেকেন্ডের মধ্যে ২০০ ওকে দেওয়া যায়
    if (conversation.status === "ACTIVE") {
      // processAgentResponse হচ্ছে গ্লোবাল অর্কেস্ট্রেটর (যা আমরা ৫.৩ ধাপে তৈরি করব)
      // এটি Nuxt Server Auto-import ফিচারের কারণে সরাসরি কল করা যাবে
      processAgentResponse(conversation.id, channel.organizationId, messageContent).catch((err: unknown) => {
        console.error("Background AI agent processing failed:", err)
      })
    }
  } catch (error) {
    console.error("Failed to process incoming webhook message:", error)
  }

  return respondOk()
})
