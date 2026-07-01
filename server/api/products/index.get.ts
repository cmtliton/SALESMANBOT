// server/api/products/index.get.ts
import { serverSupabaseClient } from "#supabase/server";
import { userRepository } from "../../repository/userRepository";
import { productRepository } from "../../repository/productRepository";

export default defineEventHandler(async (event) => {
  try {
    // ১. সার্ভার-সাইড Supabase ইউজার সেশন ভেরিফিকেশন (ইউজারের নিজস্ব সেশন API থেকে)
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

    // ২. ইমেইল দিয়ে ডাটাবেস থেকে ইউজারের organizationId খুঁজে বের করা
    const dbUser = await userRepository.findByEmail(supabaseUser.email);
    const orgId = dbUser?.organizationId;

    if (!dbUser || !orgId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: User profile or workspace not found",
      });
    }

    // ৩. রেপোজিটরি ব্যবহার করে ওই ওয়ার্কস্পেসের সমস্ত প্রোডাক্ট রিড করা
    const products = await productRepository.getProductsByOrg(orgId);

    return {
      success: true,
      data: products,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in GET /api/products:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
