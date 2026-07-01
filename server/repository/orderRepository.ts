// server/repository/orderRepository.ts
import { prisma } from "../utils/db"; // relative path to server/utils/db.ts [1.1]

export const orderRepository = {
  /**
   * চ্যাটের ভেতর এআই এজেন্টের রিকোয়েস্টে অথবা ড্যাশবোর্ড থেকে অর্ডার ক্রিয়েট করা (স্টক ডিডাকশন ও রোলব্যাক প্রটেকশন সহ)
   */
  async createPendingOrder(
    orgId: string,
    conversationId: string,
    customerName: string,
    customerPhone: string,
    deliveryAddress: string,
    items: { productId: string; quantity: number; price: number }[],
  ) {
    if (!items || items.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Bad Request: Cannot create an order with an empty items list",
      });
    }

    // আইটেমের দাম এবং পরিমাণের ওপর ভিত্তি করে মোট অ্যামাউন্ট বের করা হচ্ছে
    const totalAmount = items.reduce((acc, item) => {
      return acc + Number(item.price) * item.quantity;
    }, 0);

    // ট্রানজেকশন ব্লক: স্টক চেক, ডিডাকশন ও অর্ডার তৈরি একসাথে সম্পন্ন করার জন্য
    return await prisma.$transaction(async (tx) => {
      // ১. প্রতিটি প্রোডাক্টের স্টক ভেরিফিকেশন এবং ইনভেন্টরি স্টক ডিক্রিমেন্ট করা [1.1]
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { title: true, stock: true },
        });

        if (!product) {
          throw createError({
            statusCode: 404,
            statusMessage: `Product with ID ${item.productId} not found`,
          });
        }

        // স্টক পর্যাপ্ত না থাকলে ট্রানজেকশন বাতিল ও রোলব্যাক হবে [1.1]
        if (product.stock < item.quantity) {
          throw createError({
            statusCode: 400,
            statusMessage: `Insufficient stock for product "${product.title}". Available: ${product.stock}, Requested: ${item.quantity}`,
          });
        }

        // স্টক বিয়োগ করা হচ্ছে [1.1]
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // ২. নতুন পেন্ডিং অর্ডার রেকর্ড ক্রিয়েট করা
      const order = await tx.order.create({
        data: {
          organizationId: orgId,
          conversationId,
          customerName,
          customerPhone,
          deliveryAddress,
          totalAmount,
          currency: "BDT",
          status: "PENDING",
        },
      });

      // ৩. অর্ডারের সাথে কেনা আইটেমগুলো ম্যাপ করে OrderItem টেবিলে সেভ করা
      const orderItemPayload = items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      await tx.orderItem.createMany({
        data: orderItemPayload,
      });

      return order;
    });
  },
};
