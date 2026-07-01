/* eslint-disable @stylistic/operator-linebreak */
// server/api/products/import-woo.post.ts
import { z } from "zod";
import { serverSupabaseClient } from "#supabase/server";
import { userRepository } from "../../repository/userRepository";
import { productRepository } from "../../repository/productRepository";
import { embedMany } from "ai";
import { getOllamaEmbeddingModel } from "../../utils/ai-service"; // গ্লোবাল এআই সার্ভিস ইম্পোর্ট [1]

// ১. Zod স্কিমা দিয়ে উ-কমার্স ক্রেডেনশিয়াল ভ্যালিডেশন
const importWooSchema = z.object({
  storeUrl: z
    .string()
    .trim()
    .min(1, "Store URL is required")
    .url("Please enter a valid store URL (e.g., https://mystore.com)"),
  consumerKey: z.string().trim().min(1, "Consumer Key is required"),
  consumerSecret: z.string().trim().min(1, "Consumer Secret is required"),
});

export default defineEventHandler(async (event) => {
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

  // ৩. Zod দিয়ে বডি ডাটা ভ্যালিডেশন
  const body = await readBody(event);
  const validation = importWooSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      data: validation.error.format(),
    });
  }

  const { storeUrl, consumerKey, consumerSecret } = validation.data;

  // ৪. উ-কমার্স কানেকশন ইউআরএল তৈরি এবং অথেনটিকেশন হেডার সেটআপ
  const cleanUrl = storeUrl.replace(/\/+$/, ""); // শেষের অতিরিক্ত স্ল্যাশ বাদ দেওয়া হচ্ছে
  const targetUrl = `${cleanUrl}/wp-json/wc/v3/products?per_page=100`; // সর্বোচ্চ ১০০টি প্রোডাক্ট কুয়েরি করা হচ্ছে

  // Basic Auth base64 এনকোড করা হচ্ছে
  const authString = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64",
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wooProducts: any[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wooProducts = await $fetch<any[]>(targetUrl, {
      headers: {
        Authorization: `Basic ${authString}`,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (fetchErr: any) {
    console.error("WooCommerce API Connection Failed:", fetchErr);
    throw createError({
      statusCode: 502,
      statusMessage:
        "Bad Gateway: Failed to connect to your WooCommerce store. Please verify URL and API keys.",
      data: fetchErr.message,
    });
  }

  if (!Array.isArray(wooProducts)) {
    throw createError({
      statusCode: 502,
      statusMessage:
        "Bad Gateway: Invalid response format from WooCommerce API",
    });
  }

  if (wooProducts.length === 0) {
    return {
      success: true,
      importedCount: 0,
      message: "No products found in your WooCommerce store.",
    };
  }

  // ৫. প্রোডাক্ট ডাটাবেসে ম্যাপ করা
  // eslint-disable-next-line @stylistic/member-delimiter-style
  const processedProducts: { id: string; textInput: string }[] = [];

  for (const wooProduct of wooProducts) {
    try {
      // Upsert করা হচ্ছে
      const dbProduct = await productRepository.upsertWooCommerceProduct(
        orgId,
        wooProduct,
      );

      // এআই ভেক্টর এম্বেডিং তৈরির জন্য টাইটেল ও ডেসক্রিপশন টেক্সট প্রিপেয়ার করা হচ্ছে
      const textInput = `Title: ${dbProduct.title}. Description: ${dbProduct.description}`;

      processedProducts.push({
        id: dbProduct.id,
        textInput,
      });
    } catch (dbErr) {
      console.error(
        `Skipping WooCommerce product ID ${wooProduct.id} due to db error:`,
        dbErr,
      );
    }
  }

  // ৬. ওল্লামা লোকাল এম্বেডিং জেনারেশন (Batch AI Embeddings - Highly performant)
  if (processedProducts.length > 0) {
    try {
      // এম্বেড করার ইনপুটগুলো অ্যারেতে নেওয়া হচ্ছে
      const textInputs = processedProducts.map(
        (p: { textInput: string }) => p.textInput,
      );

      // আমাদের সেন্ট্রাল ai-service থেকে ওল্লামা এম্বেডিং মডেল আনা হচ্ছে
      const embeddingModel = getOllamaEmbeddingModel("nomic-embed-text");

      // nomic-embed-text লোকাল মডেল দিয়ে একবারে ব্যাচ এম্বেডিং জেনারেশন
      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: textInputs,
      });

      if (
        Array.isArray(embeddings) &&
        embeddings.length === processedProducts.length
      ) {
        // প্রতিটি প্রোডাক্টের এগেইন্সটে লুপ চালিয়ে pgvector এম্বেডিং সেভ করা হচ্ছে
        for (let i = 0; i < processedProducts.length; i++) {
          const productId = processedProducts[i]?.id;
          const embedding = embeddings[i];
          if (embedding) {
            await productRepository.saveProductEmbedding(
              productId as string,
              embedding,
            );
          }
        }
      } else {
        console.error(
          "Batch embedding response size mismatch or invalid structure.",
        );
      }
    } catch (aiErr) {
      // এম্বেডিং জেনারেট করতে ভুল হলেও মূল প্রোডাক্ট ইমপোর্ট যেন সাকসেস থাকে, সেজন্য এখানে ট্রাই-ক্যাচ হ্যান্ডেল করা হয়েছে
      console.error(
        "Failed to generate batch vector embeddings for imported products:",
        aiErr,
      );
    }
  }

  return {
    success: true,
    importedCount: processedProducts.length,
    message: `Successfully synced ${processedProducts.length} products from your WooCommerce store.`,
  };
});
