<!-- app/components/products/AddProductSlideover.vue -->
<script setup lang="ts">
import { z } from "zod"
import type { FormSubmitEvent } from "#ui/types"

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

const supabase = useSupabaseClient()
const productStore = useProductStore()
const toast = useToast()
const authStore = useAuthStore()

// ── Form state ──
const state = reactive({
  title: "",
  description: "",
  price: undefined as number | undefined,
  stock: undefined as number | undefined,
  rawKeywords: "",
  allowDescriptionInChat: true
})

// Uploaded image URLs live outside the Zod schema (managed separately)
const images = ref<string[]>([])
const isUploading = ref(false)

// ── Zod schema ──
const schema = z.object({
  title: z
    .string()
    .min(1, "Product title is required")
    .min(2, "Title must be at least 2 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .min(10, "Description must be at least 10 characters"),
  price: z
    .number({ error: "Price is required and must be a number" })
    .min(0, "Price cannot be negative"),
  stock: z
    .number({ error: "Stock is required and must be a number" })
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
  rawKeywords: z.string().optional(),
  allowDescriptionInChat: z.boolean()
})

type ProductSchema = z.output<typeof schema>

// ── Reset ──
function resetForm() {
  state.title = ""
  state.description = ""
  state.price = undefined
  state.stock = undefined
  state.rawKeywords = ""
  state.allowDescriptionInChat = true
  images.value = []
}

function handleClose() {
  if (productStore.isLoading || isUploading.value) return
  resetForm()
  emit("update:modelValue", false)
}

// ── Supabase image upload ──
async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) return

  const orgId = authStore.user?.organizationId
  if (!orgId) {
    toast.add({
      title: "Session Error",
      description: "Organization ID missing. Please log in again.",
      color: "error",
      icon: "i-lucide-circle-x"
    })
    return
  }

  isUploading.value = true
  const files = Array.from(target.files)
  let uploadedCount = 0

  try {
    for (const file of files) {
      const ext = file.name.split(".").pop()
      const path = `uploads/${orgId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from("products")
        .upload(path, file, { cacheControl: "3600", upsert: false })

      if (error) throw error

      const { data } = supabase.storage.from("products").getPublicUrl(path)
      if (data?.publicUrl) {
        images.value.push(data.publicUrl)
        uploadedCount++
      }
    }

    toast.add({
      title: `${uploadedCount} image${uploadedCount > 1 ? "s" : ""} uploaded`,
      description: "Images are ready to attach to this product.",
      color: "success",
      icon: "i-lucide-image"
    })
  } catch (err: unknown) {
    toast.add({
      title: "Upload Failed",
      description: err instanceof Error ? err.message : "Could not upload one or more images.",
      color: "error",
      icon: "i-lucide-circle-x"
    })
  } finally {
    isUploading.value = false
    target.value = "" // reset so the same file can be re-selected
  }
}

function removeImage(index: number) {
  images.value.splice(index, 1)
}

// ── Submit ──
async function handleSubmit(event: FormSubmitEvent<ProductSchema>) {
  const aiKeywords = event.data.rawKeywords
    ? event.data.rawKeywords.split(",").map(k => k.trim()).filter(Boolean)
    : []

  try {
    await productStore.addProduct({
      title: event.data.title,
      description: event.data.description,
      price: event.data.price,
      stock: event.data.stock,
      images: images.value,
      allowDescriptionInChat: event.data.allowDescriptionInChat,
      aiKeywords,
      isCombo: false,
      isVariable: false,
      currency: "BDT",
      visibleOnChannels: ["WHATSAPP", "MESSENGER", "INSTAGRAM"]
    })

    toast.add({
      title: "Product Added",
      description: `"${event.data.title}" has been added and vectorized.`,
      color: "success",
      icon: "i-lucide-circle-check"
    })

    handleClose()
  } catch (err: unknown) {
    toast.add({
      title: "Failed to Add Product",
      description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      color: "error",
      icon: "i-lucide-circle-x"
    })
  }
}
</script>

<template>
  <!--
    v4 USlideover API:
      :open        → replaces v-model on the component
      @update:open → syncs close events back to the parent
      :dismissible → blocked while uploading or saving
      #content     → full custom slot; replaces wrapping a div inside the component
  -->
  <USlideover
    :open="props.modelValue"
    side="right"
    :dismissible="!productStore.isLoading && !isUploading"
    :ui="{ content: 'bg-neutral-950 border-l border-neutral-800 w-full sm:max-w-lg flex flex-col' }"
    @update:open="(val) => { if (!val) handleClose() }"
  >
    <template #content>
      <!--
        UForm wraps the entire slideover body including the sticky footer,
        so the footer's type="submit" UButton triggers Zod validation normally.
      -->
      <UForm
        :schema="schema"
        :state="state"
        class="flex flex-col h-full"
        @submit="handleSubmit"
      >
        <!-- ── Header ── -->
        <div class="h-16 shrink-0 flex items-center justify-between px-6 border-b border-neutral-800">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-xl shrink-0">
              <UIcon
                name="i-lucide-package-plus"
                class="w-5 h-5 text-primary"
              />
            </div>
            <div>
              <h2 class="text-base font-bold text-white">
                Add New Product
              </h2>
              <p class="text-xs text-neutral-500">
                Fill in the details below to list a product.
              </p>
            </div>
          </div>

          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="productStore.isLoading || isUploading"
            aria-label="Close"
            @click="handleClose"
          />
        </div>

        <!-- ── Scrollable form body ── -->
        <div class="flex-1 overflow-y-auto p-6 space-y-5">
          <!-- Title -->
          <UFormField
            name="title"
            label="Product Title"
            required
            size="lg"
          >
            <UInput
              v-model="state.title"
              placeholder="e.g., Premium Smart Watch"
              leading-icon="i-lucide-tag"
              size="lg"
              class="w-full"
              :disabled="productStore.isLoading"
              :ui="{
                base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
              }"
            />
          </UFormField>

          <!-- Description -->
          <UFormField
            name="description"
            label="Description"
            required
            size="lg"
          >
            <UTextarea
              v-model="state.description"
              placeholder="Describe product features, specs, and warranty..."
              size="lg"
              :rows="4"
              class="w-full"
              :disabled="productStore.isLoading"
              :ui="{
                base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
              }"
            />
          </UFormField>

          <!-- Price + Stock (2-col grid) -->
          <div class="grid grid-cols-2 gap-4">
            <UFormField
              name="price"
              label="Price (BDT)"
              required
              size="lg"
            >
              <UInput
                v-model="state.price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                leading-icon="i-lucide-bangladeshi-taka"
                size="lg"
                class="w-full"
                :disabled="productStore.isLoading"
                :ui="{
                  base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
                }"
              />
            </UFormField>

            <UFormField
              name="stock"
              label="Stock Quantity"
              required
              size="lg"
            >
              <UInput
                v-model="state.stock"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                leading-icon="i-lucide-boxes"
                size="lg"
                class="w-full"
                :disabled="productStore.isLoading"
                :ui="{
                  base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
                }"
              />
            </UFormField>
          </div>

          <!-- AI Keywords -->
          <UFormField
            name="rawKeywords"
            label="AI Keywords"
            size="lg"
            help="Comma-separated. Helps AI agents match search queries to this product."
          >
            <UInput
              v-model="state.rawKeywords"
              placeholder="e.g., waterproof, fitness tracker, smartwatch"
              leading-icon="i-lucide-sparkles"
              size="lg"
              class="w-full"
              :disabled="productStore.isLoading"
              :ui="{
                base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500'
              }"
            />
          </UFormField>

          <!-- Allow description in chat -->
          <UFormField
            name="allowDescriptionInChat"
            size="lg"
          >
            <UCheckbox
              v-model="state.allowDescriptionInChat"
              label="Allow AI agents to share this description in chat"
              :disabled="productStore.isLoading"
            />
          </UFormField>

          <USeparator />

          <!-- Image upload -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-neutral-300">
                Product Images
              </p>
              <span class="text-xs text-neutral-600">{{ images.length }} uploaded</span>
            </div>

            <!-- Drop zone -->
            <label
              class="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-colors duration-200"
              :class="isUploading
                ? 'border-primary/40 bg-primary/5 cursor-not-allowed'
                : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-800/50'"
            >
              <div class="flex flex-col items-center gap-1.5 pointer-events-none">
                <UIcon
                  :name="isUploading ? 'i-lucide-loader-circle' : 'i-lucide-cloud-upload'"
                  class="w-7 h-7 text-neutral-500"
                  :class="{ 'animate-spin text-primary': isUploading }"
                />
                <p class="text-xs font-semibold text-neutral-400">
                  {{ isUploading ? 'Uploading to Supabase Storage...' : 'Click to upload images' }}
                </p>
                <p class="text-[10px] text-neutral-600">PNG, JPG, WEBP supported</p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                class="hidden"
                :disabled="isUploading || productStore.isLoading"
                @change="handleFileUpload"
              >
            </label>

            <!-- Image thumbnail grid -->
            <div
              v-if="images.length"
              class="grid grid-cols-4 gap-2"
            >
              <div
                v-for="(url, idx) in images"
                :key="url"
                class="relative aspect-square rounded-xl overflow-hidden bg-neutral-800 border border-neutral-700 group"
              >
                <img
                  :src="url"
                  :alt="`Product image ${idx + 1}`"
                  class="w-full h-full object-cover"
                >
                <!-- Delete overlay -->
                <button
                  type="button"
                  class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-150"
                  :disabled="productStore.isLoading"
                  @click="removeImage(idx)"
                >
                  <UIcon
                    name="i-lucide-trash-2"
                    class="w-5 h-5 text-error"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Sticky footer ── -->
        <div class="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-950">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            size="lg"
            :disabled="productStore.isLoading || isUploading"
            @click="handleClose"
          >
            Cancel
          </UButton>

          <UButton
            type="submit"
            size="lg"
            :loading="productStore.isLoading"
            :disabled="productStore.isLoading || isUploading"
            trailing-icon="i-lucide-package-plus"
          >
            {{ productStore.isLoading ? 'Saving...' : 'Add Product' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </USlideover>
</template>
