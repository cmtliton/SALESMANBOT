// server/api/products/index.delete.ts
import { serverSupabaseClient } from "#supabase/server"
import { userRepository } from "../../repository/userRepository"
import { productRepository } from "../../repository/productRepository"

export default defineEventHandler(async (event) => {
  try {
    // ১. সেশন ও ওনারশিপ চেক
    const supabase = await serverSupabaseClient(event)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser || !supabaseUser.email) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized: No active session found"
      })
    }

    const dbUser = await userRepository.findByEmail(supabaseUser.email)
    const orgId = dbUser?.organizationId

    if (!dbUser || !orgId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: User profile or workspace not found"
      })
    }

    // ২. কুয়েরি প্যারামিটার থেকে প্রোডাক্ট আইডি রিড করা
    const query = getQuery(event)
    const productId = query.id as string

    if (!productId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: Product ID is required"
      })
    }

    // ৩. রেপোজিটরি কল করে ওনারশিপ চেক সহ প্রোডাক্ট ডিলিট করা
    await productRepository.deleteProduct(productId, orgId)

    return {
      success: true,
      message: "Product deleted successfully"
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in DELETE /api/products:", error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error: Failed to delete product"
    })
  }
})
