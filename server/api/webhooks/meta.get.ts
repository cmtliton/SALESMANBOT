// server/api/webhooks/meta.get.ts
import { prisma } from "../../utils/db"
// relative path to server/utils/db.ts [1.1]
const config = useRuntimeConfig().public // [1.2]
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const mode = query["hub.mode"]
  const token = query["hub.verify_token"]
  const challenge = query["hub.challenge"]

  if (mode === "subscribe" && token) {
    // ক. সিস্টেম এনভায়রনমেন্টে যদি গ্লোবাল টোকেন ডিফাইন করা থাকে, তবে তার সাথে ম্যাচ করা হচ্ছে
    if (config.metaVerifyToken && token === config.metaVerifyToken) {
      setResponseHeader(event, "Content-Type", "text/plain")
      return challenge
    }
    // খ. অথবা ডাটাবেসের যেকোনো চ্যানেলে সংরক্ষিত 'webhookVerifyToken' এর সাথে ম্যাচ করা হচ্ছে
    const channel = await prisma.channel.findFirst({
      where: {
        webhookVerifyToken: token as string,
        status: "ACTIVE"
      }
    })

    if (channel) {
      setResponseHeader(event, "Content-Type", "text/plain")
      return challenge
    }
  }
  // টোকেন ভুল হলে ৪০৩ (Forbidden) এরর থ্রো করবে
  throw createError({
    statusCode: 403,
    statusMessage: "Forbidden: Invalid verification token"
  })
})
