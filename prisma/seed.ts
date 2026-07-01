import "dotenv/config"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./generated/client"

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // ==========================================
  // ১. Organization তৈরি
  // ==========================================
  const org = await prisma.organization.upsert({
    where: { id: "org-seed-001" },
    update: {},
    create: {
      id: "org-seed-001",
      name: "Demo Company BD",
      walletBalance: 500.0,
      bonusCredit: 100,
      permanentCredit: 50,
      dailyQuotaLimit: 1000
    }
  })
  console.log("✅ Organization created:", org.name)

  // ==========================================
  // ২. User তৈরি
  // ==========================================
  const owner = await prisma.user.upsert({
    where: { email: "owner@democompany.com" },
    update: {},
    create: {
      id: "user-seed-owner-001",
      email: "owner@democompany.com",
      name: "Rahim Owner",
      phoneNumber: "01711000001",
      role: "OWNER",
      organizationId: org.id
    }
  })

  const admin = await prisma.user.upsert({
    where: { email: "admin@democompany.com" },
    update: {},
    create: {
      id: "user-seed-admin-001",
      email: "admin@democompany.com",
      name: "Karim Admin",
      phoneNumber: "01711000002",
      role: "ADMIN",
      organizationId: org.id
    }
  })

  const member = await prisma.user.upsert({
    where: { email: "member@democompany.com" },
    update: {},
    create: {
      id: "user-seed-member-001",
      email: "member@democompany.com",
      name: "Salam Member",
      phoneNumber: "01711000003",
      role: "MEMBER",
      organizationId: org.id
    }
  })
  console.log("✅ Users created:", owner.name, admin.name, member.name)

  // ==========================================
  // ৩. Team Invite তৈরি
  // ==========================================
  const invite = await prisma.teamInvite.upsert({
    where: { token: "invite-token-seed-001" },
    update: {},
    create: {
      email: "newmember@democompany.com",
      role: "MEMBER",
      token: "invite-token-seed-001",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // ৭ দিন পরে
      organizationId: org.id
    }
  })
  console.log("✅ Team invite created for:", invite.email)

  // ==========================================
  // ৪. Channel তৈরি (WhatsApp)
  // ==========================================
  const whatsappChannel = await prisma.channel.upsert({
    where: { id: "channel-seed-wa-001" },
    update: {},
    create: {
      id: "channel-seed-wa-001",
      platform: "WHATSAPP",
      status: "ACTIVE",
      whatsAppPhoneId: "1234567890",
      whatsAppAccountId: "wa-account-001",
      whatsAppAccessToken: "wa-access-token-demo",
      webhookVerifyToken: "webhook-verify-seed-001",
      organizationId: org.id
    }
  })

  // Channel তৈরি (Messenger)
  const messengerChannel = await prisma.channel.upsert({
    where: { id: "channel-seed-ms-001" },
    update: {},
    create: {
      id: "channel-seed-ms-001",
      platform: "MESSENGER",
      status: "ACTIVE",
      pageId: "fb-page-id-001",
      pageAccessToken: "fb-page-access-token-demo",
      webhookVerifyToken: "webhook-verify-seed-002",
      organizationId: org.id
    }
  })
  console.log("✅ Channels created:", whatsappChannel.platform, messengerChannel.platform)

  // ==========================================
  // ৫. AI Settings তৈরি
  // ==========================================
  const aiSettings = await prisma.aISettings.upsert({
    where: { channelId: whatsappChannel.id },
    update: {},
    create: {
      provider: "GEMINI",
      modelName: "gemini-1.5-flash",
      systemPrompt:
        "আপনি একটি বাংলাদেশি ই-কমার্স শপের AI সহকারী। আপনি বাংলা ও ইংরেজিতে কথা বলতে পারেন। গ্রাহকদের পণ্য সম্পর্কে সাহায্য করুন।",
      imagePrompt: "পণ্যের ছবি দেখে বিস্তারিত বর্ণনা দিন।",
      smartReplyDelay: 3,
      memoryContextLimit: 15,
      creativity: 0.7,
      diversity: 0.9,
      semanticCacheEnabled: true,
      semanticCacheThreshold: 0.95,
      embeddingEnabled: true,
      proPlusMode: false,
      orderEmailNotifications: true,
      notificationEmail: "orders@democompany.com",
      channelId: whatsappChannel.id
    }
  })
  console.log("✅ AI Settings created for channel:", aiSettings.channelId)

  // ==========================================
  // ৬. Products তৈরি
  // ==========================================
  const product1 = await prisma.product.upsert({
    where: { id: "product-seed-001" },
    update: {},
    create: {
      id: "product-seed-001",
      title: "প্রিমিয়াম কটন পাঞ্জাবি",
      description:
        "উচ্চমানের কটন কাপড় দিয়ে তৈরি আরামদায়ক পাঞ্জাবি। ঈদ ও বিশেষ অনুষ্ঠানের জন্য আদর্শ।",
      allowDescriptionInChat: true,
      aiKeywords: ["পাঞ্জাবি", "কটন", "ঈদ", "পোশাক", "punjabi"],
      isCombo: false,
      price: 1200.0,
      currency: "BDT",
      stock: 50,
      images: [
        "https://cdn.example.com/products/punjabi-1.jpg",
        "https://cdn.example.com/products/punjabi-2.jpg"
      ],
      isVariable: true,
      visibleOnChannels: ["WHATSAPP", "MESSENGER"],
      organizationId: org.id
    }
  })

  const product2 = await prisma.product.upsert({
    where: { id: "product-seed-002" },
    update: {},
    create: {
      id: "product-seed-002",
      title: "হ্যান্ডমেড চামড়ার ব্যাগ",
      description:
        "খাঁটি গরুর চামড়া দিয়ে তৈরি টেকসই ও স্টাইলিশ হ্যান্ডব্যাগ। দীর্ঘস্থায়ী ও আকর্ষণীয় ডিজাইন।",
      allowDescriptionInChat: true,
      aiKeywords: ["ব্যাগ", "চামড়া", "হ্যান্ডব্যাগ", "leather", "bag"],
      isCombo: false,
      price: 3500.0,
      currency: "BDT",
      stock: 20,
      images: ["https://cdn.example.com/products/leather-bag-1.jpg"],
      isVariable: false,
      visibleOnChannels: ["WHATSAPP", "MESSENGER", "INSTAGRAM"],
      organizationId: org.id
    }
  })

  const product3 = await prisma.product.upsert({
    where: { id: "product-seed-003" },
    update: {},
    create: {
      id: "product-seed-003",
      title: "ঈদ কম্বো প্যাক (পাঞ্জাবি + ব্যাগ)",
      description: "পাঞ্জাবি ও চামড়ার ব্যাগের বিশেষ কম্বো অফার। আলাদা কিনলে ৪৭০০ টাকা, কম্বোতে মাত্র ৪২০০ টাকা।",
      allowDescriptionInChat: true,
      aiKeywords: ["কম্বো", "অফার", "ঈদ", "combo", "special"],
      isCombo: true,
      price: 4200.0,
      currency: "BDT",
      stock: 15,
      images: ["https://cdn.example.com/products/combo-eid.jpg"],
      isVariable: false,
      visibleOnChannels: ["WHATSAPP"],
      organizationId: org.id
    }
  })
  console.log("✅ Products created:", product1.title, product2.title, product3.title)

  // ==========================================
  // ৭. Conversation ও Messages তৈরি
  // ==========================================
  const conversation = await prisma.conversation.upsert({
    where: { id: "conv-seed-001" },
    update: {},
    create: {
      id: "conv-seed-001",
      customerId: "wa-customer-88017XXXXXXXX",
      customerName: "জনাব করিম",
      customerPhone: "01800000001",
      summary: "গ্রাহক পাঞ্জাবির দাম ও স্টক সম্পর্কে জিজ্ঞেস করেছেন।",
      tags: ["Lead", "Priority"],
      status: "ACTIVE",
      organizationId: org.id,
      channelId: whatsappChannel.id
    }
  })

  await prisma.message.createMany({
    data: [
      {
        id: "msg-seed-001",
        senderType: "CUSTOMER",
        content: "আসসালামু আলাইকুম, পাঞ্জাবির দাম কত?",
        isAiReplied: false,
        conversationId: conversation.id
      },
      {
        id: "msg-seed-002",
        senderType: "BOT",
        content:
          "ওয়ালাইকুম আসসালাম! আমাদের প্রিমিয়াম কটন পাঞ্জাবির দাম মাত্র ১২০০ টাকা। স্টকে ৫০টি আছে। অর্ডার করতে চাইলে জানান! 😊",
        isAiReplied: true,
        conversationId: conversation.id
      },
      {
        id: "msg-seed-003",
        senderType: "CUSTOMER",
        content: "ঠিক আছে, একটা অর্ডার করতে চাই।",
        isAiReplied: false,
        conversationId: conversation.id
      }
    ],
    skipDuplicates: true
  })
  console.log("✅ Conversation & messages created")

  // ==========================================
  // ৮. Order তৈরি
  // ==========================================
  const order = await prisma.order.upsert({
    where: { id: "order-seed-001" },
    update: {},
    create: {
      id: "order-seed-001",
      customerName: "জনাব করিম",
      customerPhone: "01800000001",
      deliveryAddress: "বাড়ি ৫, রোড ১২, ধানমন্ডি, ঢাকা-১২০৯",
      totalAmount: 1200.0,
      currency: "BDT",
      status: "PENDING",
      organizationId: org.id,
      conversationId: conversation.id
    }
  })

  await prisma.orderItem.upsert({
    where: { id: "orderitem-seed-001" },
    update: {},
    create: {
      id: "orderitem-seed-001",
      quantity: 1,
      price: 1200.0,
      orderId: order.id,
      productId: product1.id
    }
  })
  console.log("✅ Order created:", order.id, "| Status:", order.status)

  // ==========================================
  // ৯. Manual Deposit তৈরি
  // ==========================================
  const deposit = await prisma.manualDeposit.upsert({
    where: { transactionId: "TXN-BKASH-SEED-001" },
    update: {},
    create: {
      method: "BKASH",
      senderNumber: "01712345678",
      transactionId: "TXN-BKASH-SEED-001",
      amount: 500.0,
      status: "APPROVED",
      organizationId: org.id
    }
  })
  console.log("✅ Manual deposit created:", deposit.transactionId)

  // ==========================================
  // ১০. Developer API Key তৈরি
  // ==========================================
  const apiKey = await prisma.developerApiKey.upsert({
    where: { key: "dev-api-key-seed-hashed-001" },
    update: {},
    create: {
      name: "Internal CRM Integration",
      key: "dev-api-key-seed-hashed-001",
      organizationId: org.id
    }
  })
  console.log("✅ Developer API key created:", apiKey.name)

  console.log("\n🎉 সকল seed data সফলভাবে তৈরি হয়েছে!")
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
