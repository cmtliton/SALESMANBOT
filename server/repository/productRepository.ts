// server/repository/productRepository.ts
import type { Prisma } from "../../prisma/generated/client"
import { prisma } from "../utils/db" // আপনার server/utils/db.ts এর আপেক্ষিক পাথ অনুযায়ী

export const productRepository = {
  /**
   * ১. নির্দিষ্ট অর্গানাইজেশনের সমস্ত প্রোডাক্ট রিড করা
   */
  async getProductsByOrg(orgId: string) {
    return await prisma.product.findMany({
      where: {
        organizationId: orgId
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  },

  /**
   * ২. ম্যানুয়ালি নতুন প্রোডাক্ট তৈরি করা
   */
  async createProduct(data: Prisma.ProductCreateInput) {
    return await prisma.product.create({
      data
    })
  },

  /**
   * ৩. নির্দিষ্ট প্রোডাক্ট আপডেট করা (সিকিউরিটি ও ওনারশিপ চেক সহ)
   */
  async updateProduct(id: string, orgId: string, data: Prisma.ProductUpdateInput) {
    // মাল্টি-টেন্যান্ট ওনারশিপ ভেরিফাই করা হচ্ছে
    const product = await prisma.product.findFirst({
      where: {
        id,
        organizationId: orgId
      }
    })

    if (!product) {
      throw createError({
        statusCode: 403,
        statusMessage: "Unauthorized: Product not found or access denied"
      })
    }

    return await prisma.product.update({
      where: { id },
      data
    })
  },

  /**
   * ৪. প্রোডাক্ট ডিলিট করা (সিকিউরিটি ও ওনারশিপ চেক সহ)
   */
  async deleteProduct(id: string, orgId: string) {
    // মাল্টি-টেন্যান্ট ওনারশিপ ভেরিফাই করা হচ্ছে
    const product = await prisma.product.findFirst({
      where: {
        id,
        organizationId: orgId
      }
    })

    if (!product) {
      throw createError({
        statusCode: 403,
        statusMessage: "Unauthorized: Product not found or access denied"
      })
    }

    return await prisma.product.delete({
      where: { id }
    })
  },

  /**
   * ৫. WooCommerce থেকে আসা প্রোডাক্ট ডাটা ম্যাপ করে Upsert (ইনসার্ট বা আপডেট) করা
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async upsertWooCommerceProduct(orgId: string, data: any) {
    const wooId = parseInt(data.id)
    const title = data.name || ""
    const description = data.description || ""
    const price = parseFloat(data.price || data.regular_price || "0")
    const stock = data.manage_stock ? (data.stock_quantity || 0) : 99 // স্টক ম্যানেজ করা না থাকলে ডিফল্ট ৯৯ সেট হবে

    // ইমেজের সোর্স লিংকগুলো অ্যারে হিসেবে এক্সট্রাক্ট করা হচ্ছে
    const images = Array.isArray(data.images)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? data.images.map((img: any) => img.src)
      : []

    // এই অর্গানাইজেশনের জন্য এই উ-কমার্স আইডি সম্বলিত প্রোডাক্ট পূর্বে এন্ট্রি করা হয়েছে কিনা চেক করা
    const existingProduct = await prisma.product.findFirst({
      where: {
        wooCommerceId: wooId,
        organizationId: orgId
      }
    })

    if (existingProduct) {
      // যদি আগে থেকেই প্রোডাক্টটি থাকে, তবে শুধু তার তথ্য আপডেট করা হবে
      return await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          title,
          description,
          price,
          stock,
          images,
          visibleOnChannels: ["WHATSAPP", "MESSENGER", "INSTAGRAM"]
        }
      })
    } else {
      // প্রোডাক্ট ডাটাবেসে না থাকলে নতুন প্রোডাক্ট তৈরি করা হবে
      return await prisma.product.create({
        data: {
          title,
          description,
          price,
          stock,
          images,
          wooCommerceId: wooId,
          organizationId: orgId,
          visibleOnChannels: ["WHATSAPP", "MESSENGER", "INSTAGRAM"]
        }
      })
    }
  },

  /**
   * ৬. Raw SQL দিয়ে প্রোডাক্টের 'embedding' কলামে pgvector সেভ করা
   */
  async saveProductEmbedding(productId: string, embedding: number[]) {
    // নিউমেরিক অ্যারেকে pgvector স্ট্রিং ফরম্যাটে ('[0.12, -0.45, ...]') রূপান্তর করা হচ্ছে
    const vectorString = `[${embedding.join(",")}]`

    // $executeRawUnsafe ব্যবহার করে সঠিকভাবে ভেক্টর কাস্টিং ও প্যারামিটার বাইন্ডিং সম্পন্ন করা হলো
    return await prisma.$executeRawUnsafe(
      "UPDATE \"Product\" SET embedding = $1::vector WHERE id = $2",
      vectorString,
      productId
    )
  }
}
