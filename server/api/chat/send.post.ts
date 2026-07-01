// server/api/chat/send.post.ts
import { z } from "zod"
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../repository/userRepository" // relative path [1.1]
import { chatRepository } from "../../repository/chatRepository" // relative path [1.1]
import { prisma } from "../../utils/db" // relative path to database utility [1.1]

// ১. Zod স্কিমা দিয়ে ইনকামিং ডাটা ভ্যালিডেশন [1.1]
const sendSchema = z.object({
  conversationId: z.string("Conversation ID is required").uuid("Invalid conversation ID"),
  content: z.string("Message content is required").trim().min(1, "Message content cannot be empty")
})

export default defineEventHandler(async (event) => {
  try {
    // ২. সার্ভার-সাইড Supabase ইউজার সেশন ভেরিফিকেশন
    const supabase = await serverSupabaseClient(event)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized: No active session found",
      })
    }

    // ৩. ইমেইল দিয়ে ডাটাবেস থেকে ইউজারের organizationId খুঁজে বের করা
    const dbUser = await userRepository.findByEmail(supabaseUser.email)
    const orgId = dbUser?.organizationId

    if (!dbUser || !orgId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: User profile or workspace not found",
      })
    }

    // ৪. Zod ভ্যালিডেশন [1.1]
    const body = await readBody(event)
    const validation = sendSchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: validation.error.format(),
      })
    }

    const { conversationId, content } = validation.data

    const checkConv = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    // কনসোলে আইডিটি প্রিন্ট করবে
    // eslint-disable-next-line no-console
    console.log(`[Diagnostic] Sending manual message to customerId: "${checkConv?.customerId}"`)

    if (checkConv?.customerId === "undefined" || checkConv?.customerId === "null" || !checkConv?.customerId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: The customer ID in this conversation is invalid (undefined/null). Please delete this conversation and start fresh.",
      })
    }

    // ৫. ডাটাবেসে এজেন্ট (HUMAN) মেসেজ সেভ করা এবং সেশন টাইমস্ট্যাম্প আপডেট করা [1.1]
    const createdMessage = await chatRepository.saveMessage(conversationId, "HUMAN", content)

    // প্যারেন্ট কনভারসেশনের 'updatedAt' ফিল্ডটি আপডেট করা হচ্ছে যাতে এটি ইনবক্সের সবার ওপরে চলে আসে [1.1]
    const conversation = await prisma.conversation.update({
      where: {
        id: conversationId,
        organizationId: orgId // ওনারশিপ ভেরিফিকেশন নিশ্চিতকরণ
      },
      data: {
        updatedAt: new Date()
      },
      include: {
        channel: true // এপিআই ডেলিভারির সুবিধার্থে চ্যানেল রিলেশনটি ইনক্লুড করা হলো
      }
    })

    const channel = conversation.channel

    if (!channel) {
      throw createError({
        statusCode: 404,
        statusMessage: "Not Found: Channel configuration not found for this conversation",
      })
    }

    // ৬. মেটা গ্রাফ এপিআই (Meta Graph API) এর মাধ্যমে কাস্টমারকে মেসেজ পাঠানো [1.1]
    try {
      if (channel.platform === "WHATSAPP" && channel.whatsAppPhoneId && channel.whatsAppAccessToken) {
        // হোয়াটসঅ্যাপ ক্লাউড এপিআই ডেলিভারি
        await $fetch(`https://graph.facebook.com/v25.0/${channel.whatsAppPhoneId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${channel.whatsAppAccessToken}`,
            "Content-Type": "application/json"
          },
          body: {
            messaging_product: "whatsapp",
            to: conversation.customerId,
            type: "text",
            text: {
              body: content
            }
          }
        })
      } else if (channel.platform === "MESSENGER" && channel.pageAccessToken) {
        // ফেসবুক মেসেঞ্জার গ্রাফ এপিআই ডেলিভারি
        await $fetch(`https://graph.facebook.com/v25.0/me/messages?access_token=${channel.pageAccessToken}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: {
            recipient: {
              id: conversation.customerId
            },
            message: {
              text: content
            },
            // messaging_type: "RESPONSE"
            messaging_type: "MESSAGE_TAG",
            tag: "HUMAN_AGENT"
          }
        })
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (metaError: any) {
      console.error("Meta Graph API Delivery Failed:", metaError)
      // যদি মেসেজটি মেটা সার্ভারে না পাঠানো যায়, তবে আমরা এপিআই ফেইলিওর থ্রো করব
      throw createError({
        statusCode: 502,
        statusMessage: "Bad Gateway: Failed to deliver message to Meta. Please verify channel tokens.",
        data: metaError.message
      })
    }

    // ৭. সফল রেসপন্স রিটার্ন
    return {
      success: true,
      data: createdMessage
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in POST /api/chat/send:", error)

    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: Failed to send message"
    })
  }
})
