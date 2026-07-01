// server/api/products/index.post.ts
import { z } from "zod";
import { serverSupabaseClient } from "#supabase/server";
import { userRepository } from "../../repository/userRepository";
import { prisma } from "../../utils/db"; // আপনার utils/db.ts পাথ অনুযায়ী [1.1]
import { embed } from "ai";
import { getOllamaEmbeddingModel } from "../../utils/ai-service"; // গ্লোবাল এআই সার্ভিস ইম্পোর্ট [1.1]

// ১. ইনপুট ডাটা স্যানিটাইজেশনের জন্য Zod স্কিমা ডিফাইন করা
const createProductSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty"),
  description: z.string().trim().min(1, "Description cannot be empty"),
  price: z.number().min(0, "Price must be 0 or greater"),
  stock: z.number().int().min(0, "Stock must be 0 or greater"),
  images: z.array(z.string().url("Invalid image URL")),
  allowDescriptionInChat: z.boolean().default(true),
  aiKeywords: z.array(z.string().trim()).default([]),
});

export default defineEventHandler(async (event) => {
  try {
    // ২. সেশন ও ওনারশিপ চেক
    const supabase = await serverSupabaseClient(event);
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized: No active session found",
      });
    }

    const dbUser = await userRepository.findByEmail(supabaseUser.email);
    const orgId = dbUser?.organizationId;

    if (!dbUser || !orgId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: User profile or workspace not found",
      });
    }

    // ৩. Zod ভ্যালিডেশন
    const body = await readBody(event);
    const validation = createProductSchema.safeParse(body);

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: validation.error.format(),
      });
    }

    const {
      title,
      description,
      price,
      stock,
      images,
      allowDescriptionInChat,
      aiKeywords,
    } = validation.data;

    // ৪. আমাদের এআই সার্ভিস ব্যবহার করে ৭৬৮-ডাইমেনশনের লোকাল এম্বেডিং জেনারেট করা [1.1]
    const textToEmbed = `Title: ${title}. Description: ${description}`;

    // Central ai-service থেকে ওল্লামা এম্বেডিং মডেল জেনারেট করা হচ্ছে
    const embeddingModel = getOllamaEmbeddingModel("nomic-embed-text");

    const { embedding } = await embed({
      model: embeddingModel,
      value: textToEmbed,
    });

    // ওল্লামা nomic-embed-text এর ৭৬৮ ডাইমেনশন চেক [1.1]
    if (!embedding || embedding.length !== 768) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to generate correct 768-dimension embedding",
      });
    }

    // ৫. প্রিজমা ট্রানজেকশনের মাধ্যমে প্রোডাক্ট তৈরি ও র-ভেক্টর এসকিউএল সেভ করা
    const newProduct = await prisma.$transaction(async (tx) => {
      // ক. প্রোডাক্ট ক্রিয়েট করা
      const product = await tx.product.create({
        data: {
          title,
          description,
          price,
          stock,
          images,
          allowDescriptionInChat,
          aiKeywords,
          organizationId: orgId,
          visibleOnChannels: ["WHATSAPP", "MESSENGER", "INSTAGRAM"],
        },
      });

      // খ. ভেক্টর স্ট্রিং তৈরি করা
      const vectorString = `[${embedding.join(",")}]`;

      // গ. pgvector সেভ করা (৭৬৮ ডাইমেনশন ম্যাচড) [1.1]
      await tx.$executeRawUnsafe(
        // eslint-disable-next-line @stylistic/quotes
        'UPDATE "Product" SET embedding = $1::vector WHERE id = $2',
        vectorString,
        product.id,
      );

      return product;
    });

    return {
      success: true,
      data: newProduct,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in POST /api/products:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: Failed to save product catalog",
      data: error.message,
    });
  }
});
