// server/utils/agent-orchestrator.ts
import { embed, generateText, tool, stepCountIs } from "ai"
import { z } from "zod"
import { prisma } from "../utils/db"
import { chatRepository } from "../repository/chatRepository"
import { orderRepository } from "../repository/orderRepository"
import { getLanguageModel, getOllamaEmbeddingModel } from "./ai-service"

export async function processAgentResponse(
  conversationId: string,
  orgId: string,
  userMessage: string
) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    if (!conversation || conversation.status === "PAUSED_BY_USER") return

    // ১. ৭৬৮-ডাইমেনশন ভেক্টর এমবেডিং তৈরি
    const embeddingModel = getOllamaEmbeddingModel("nomic-embed-text")
    const { embedding } = await embed({
      model: embeddingModel,
      value: userMessage
    })

    if (!embedding || embedding.length !== 768) return

    const vectorString = `[${embedding.join(",")}]`
    let replyText = ""

    // ২. কাস্টমারের লেটেস্ট মেসেজে এমবেডিং সেভ করা (ভবিষ্যৎ সেমান্টিক ক্যাশের জন্য)
    try {
      const latestCustomerMsg = await prisma.message.findFirst({
        where: { conversationId, senderType: "CUSTOMER" },
        orderBy: { createdAt: "desc" }
      })

      if (latestCustomerMsg) {
        await prisma.$executeRawUnsafe(
          "UPDATE \"Message\" SET embedding = $1::vector WHERE id = $2",
          vectorString,
          latestCustomerMsg.id
        )
      }
    } catch (e) {
      console.warn("Could not save customer message embedding:", e)
    }

    // ৩. সেমান্টিক ক্যাশ চেক
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cachedMessage = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, "createdAt" FROM "Message" 
         WHERE "conversationId" = $1 AND "senderType" = 'CUSTOMER' AND (embedding <=> $2::vector) < 0.04 
         ORDER BY embedding <=> $2::vector ASC LIMIT 1`,
        conversationId,
        vectorString
      )

      if (cachedMessage && cachedMessage.length > 0) {
        const nextMsg = await prisma.message.findFirst({
          where: {
            conversationId,
            createdAt: { gt: cachedMessage[0].createdAt },
            senderType: { in: ["BOT", "HUMAN"] }
          },
          orderBy: { createdAt: "asc" }
        })

        if (nextMsg) {
          replyText = nextMsg.content
          // eslint-disable-next-line no-console
          console.log("Semantic cache hit! Reusing cached response.")
        }
      }
    } catch (cacheErr) {
      console.warn("Semantic cache check skipped:", cacheErr)
    }

    // ৪. ক্যাশ না থাকলে RAG ও LLM জেনারেশন
    if (!replyText) {
      let matchedProductsContext = "No relevant products found matching the query."

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const products = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id, title, description, price, stock, (embedding <=> $1::vector) as distance 
           FROM "Product" 
           WHERE "organizationId" = $2 AND stock > 0
           ORDER BY embedding <=> $1::vector ASC LIMIT 3`,
          vectorString,
          orgId
        )

        if (products && products.length > 0) {
          matchedProductsContext = products.map((p, i) => `
Product ${i + 1}:
ID: ${p.id}
Title: ${p.title}
Description: ${p.description}
Price: BDT ${p.price}
Stock Available: ${p.stock}
          `).join("\n\n")
        }
      } catch (ragErr) {
        console.error("RAG vector retrieval failed:", ragErr)
      }

      const aiSettings = await prisma.aISettings.findUnique({
        where: { channelId: conversation.channelId }
      })

      const systemInstructions = `
${aiSettings?.systemPrompt || "You are a helpful sales assistant."}

Store directory products matching customer query:
${matchedProductsContext}

Guidelines:
1. Converse in preferred language (Bangla, English, Banglish).
2. Display BDT prices.
3. Call tools to check stock or create orders.
`

      const limit = aiSettings?.memoryContextLimit || 10
      const prevMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: limit
      })

      const formattedHistory = prevMessages.reverse().map(msg => ({
        role: msg.senderType === "CUSTOMER" ? "user" as const : "assistant" as const,
        content: msg.content
      }))

      const activeModel = getLanguageModel(
        aiSettings?.provider || "OLLAMA",
        aiSettings?.modelName || "llama3.2",
        aiSettings?.customApiKey
      )

      // ৫. AI SDK জেনারেশন (maxSteps: 5 সহ)
      const response = await generateText({
        model: activeModel,
        system: systemInstructions,
        messages: formattedHistory,
        stopWhen: stepCountIs(5), // এটি এআইকে টুল এক্সিকিউট করে কাস্টমারের জন্য টেক্সট লিখতে বাধ্য করবে
        tools: {
          checkStock: tool({
            description: "Retrieve real-time stock quantity for a product by its ID",
            inputSchema: z.object({
              productId: z.string().uuid("Invalid product ID format")
            }),
            execute: async ({ productId }) => {
              const product = await prisma.product.findUnique({
                where: { id: productId },
                select: { title: true, stock: true }
              })
              return {
                productId,
                title: product?.title || "Unknown",
                stock: product?.stock ?? 0
              }
            }
          }),
          createOrder: tool({
            description: "Place a pending order for a customer directly in the database",
            inputSchema: z.object({
              customerName: z.string().min(1),
              customerPhone: z.string().min(1),
              deliveryAddress: z.string().min(1),
              items: z.array(z.object({
                productId: z.string().uuid(),
                quantity: z.number().int().positive(),
                price: z.number().positive()
              })).min(1)
            }),
            execute: async ({ customerName, customerPhone, deliveryAddress, items }) => {
              try {
                const order = await orderRepository.createPendingOrder(
                  orgId,
                  conversationId,
                  customerName,
                  customerPhone,
                  deliveryAddress,
                  items
                )
                return {
                  success: true,
                  orderId: order.id,
                  totalAmount: order.totalAmount,
                  status: order.status
                }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } catch (err: any) {
                return { success: false, error: err.message }
              }
            }
          })
        }
      })

      replyText = response.text
    }

    if (!replyText) return

    // ৬. রিপ্লাই সেভ ও মেটা এপিআই ডেলিভারি
    await chatRepository.saveMessage(conversationId, "BOT", replyText, { isAiReplied: true })

    // ৭. মেটা গ্রাফ এপিআই (Meta Graph API) এর মাধ্যমে কাস্টমারকে মেসেজ পাঠানো
    const channel = await prisma.channel.findUnique({
      where: { id: conversation.channelId }
    })

    if (!channel) return

    try {
      if (channel.platform === "WHATSAPP" && channel.whatsAppPhoneId && channel.whatsAppAccessToken) {
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
            text: { body: replyText }
          }
        })
      } else if (channel.platform === "MESSENGER" && channel.pageAccessToken) {
        // মেসেঞ্জার গ্রাফ এপিআই ডেলিভারি
        await $fetch(`https://graph.facebook.com/v25.0/me/messages?access_token=${channel.pageAccessToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: {
            recipient: { id: conversation.customerId },
            message: { text: replyText },
            messaging_type: "RESPONSE"
          }
        })
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (metaError: any) {
      // মেটার মূল সার্ভার থেকে আসা রিয়েল-টাইম এররের বডিটি এখানে ফিল্টার করে কনসোলে প্রিন্ট করা হবে
      const fbError = metaError.data || metaError.response?._data || {}
      console.error("AI Orchestrator: Meta Graph API Delivery Failed:", metaError.message)
      console.error("AI Orchestrator: Meta Graph API Error Details:", JSON.stringify(fbError, null, 2)) // এটি আসল সমস্যাটি কনসোলে প্রিন্ট করবে
    }
  } catch (error) {
    console.error("Fatal Error in AI Orchestrator:", error)
  }
}
