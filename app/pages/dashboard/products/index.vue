<!-- app/pages/dashboard/products/index.vue -->
<script setup lang="ts">
import { h, resolveComponent } from "vue"
import type { TableColumn } from "@nuxt/ui"
import { useProductStore } from "~/stores/product"

definePageMeta({ layout: "dashboard" })

const productStore = useProductStore()
const toast = useToast()

const isAddOpen = ref(false)
const isWooOpen = ref(false)

onMounted(() => productStore.fetchProducts())

// ── Delete handler ──
async function handleDelete(id: string, title: string) {
  const confirmed = confirm(
    `Delete "${title}"?\n\nThis will also remove its vector embeddings and cannot be undone.`
  )
  if (!confirmed) return

  try {
    await productStore.deleteProduct(id)
    toast.add({
      title: "Product Deleted",
      description: `"${title}" was removed from your catalog.`,
      color: "success",
      icon: "i-lucide-circle-check"
    })
  } catch (err: unknown) {
    toast.add({
      title: "Delete Failed",
      description: err instanceof Error ? err.message : "Something went wrong.",
      color: "error",
      icon: "i-lucide-circle-x"
    })
  }
}

// ── UTable column definitions ──
// Using h() + resolveComponent() to render Nuxt UI components inside cells.
const UBadge = resolveComponent("UBadge")
const UButton = resolveComponent("UButton")
const UIcon = resolveComponent("UIcon")

type Product = (typeof productStore.products)[number]

const columns: TableColumn<Product>[] = [
  {
    id: "product",
    header: "Product",
    cell: ({ row }) => {
      const product = row.original
      return h("div", { class: "flex items-center gap-3" }, [
        // Thumbnail
        h(
          "div",
          { class: "h-11 w-11 rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden shrink-0 flex items-center justify-center" },
          product.images?.[0]
            ? [h("img", { src: product.images[0], alt: product.title, class: "h-full w-full object-cover" })]
            : [h(UIcon, { name: "i-lucide-image", class: "w-5 h-5 text-neutral-600" })]
        ),
        // Title + description
        h("div", { class: "min-w-0" }, [
          h("p", { class: "text-sm font-semibold text-neutral-100 truncate max-w-[220px]" }, product.title),
          h("p", { class: "text-xs text-neutral-500 truncate max-w-[220px] mt-0.5" }, stripHtml(product.description))
        ])
      ])
    },
    meta: { class: { td: "min-w-[260px]" } }
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) =>
      h("span", { class: "text-sm font-semibold text-neutral-200 tabular-nums" },
        `৳${Number(row.original.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      )
  },
  {
    accessorKey: "stock",
    header: "Stock",
    cell: ({ row }) => {
      const stock = row.original.stock
      if (stock === 0) {
        return h(UBadge, { color: "error", variant: "soft", label: "Out of Stock" })
      }
      if (stock < 10) {
        return h(UBadge, { color: "warning", variant: "soft", label: `Low — ${stock} left` })
      }
      return h(UBadge, { color: "success", variant: "soft", label: `In Stock (${stock})` })
    }
  },
  {
    accessorKey: "wooCommerceId",
    header: "Source",
    cell: ({ row }) =>
      row.original.wooCommerceId
        ? h(UBadge, { color: "info", variant: "soft", leadingIcon: "i-lucide-globe", label: "WooCommerce" })
        : h(UBadge, { color: "neutral", variant: "soft", leadingIcon: "i-lucide-pencil", label: "Manual" })
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      h(UButton, {
        icon: "i-lucide-trash-2",
        color: "error",
        variant: "ghost",
        size: "sm",
        ariaLabel: "Delete product",
        onClick: () => handleDelete(row.original.id, row.original.title)
      }),
    meta: { class: { th: "w-12", td: "text-right" } }
  }
]
// ── HTML ট্যাগ রিমুভ করার কাস্টম হেল্পার ফাংশন ──
function stripHtml(html: string | null | undefined): string {
  if (!html) return ""
  return html
    .replace(/<[^>]*>/g, "") // সব ধরনের HTML ট্যাগ (<...>) মুছে ফেলবে
    .replace(/&nbsp;/g, " ") // HTML স্পেস ক্যারেক্টার ডিকোড করবে
    .replace(/&amp;/g, "&") // এন্ড (&) সিম্বল ঠিক করবে
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ") // অতিরিক্ত স্পেসগুলোকে একটি সিঙ্গেল স্পেসে রূপান্তর করবে
    .trim()
}
</script>

<template>
  <div class="space-y-6">
    <!-- ── Page header ── -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-neutral-900">
      <div class="space-y-1">
        <h1 class="text-3xl font-black text-white tracking-tight">
          Product Catalog
        </h1>
        <p class="text-neutral-400 text-sm max-w-lg">
          Manage your inventory, import from WooCommerce, and configure your AI agent knowledge base.
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <UButton
          leading-icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          size="lg"
          @click="isWooOpen = true"
        >
          Sync WooCommerce
        </UButton>

        <UButton
          leading-icon="i-lucide-plus"
          size="lg"
          @click="isAddOpen = true"
        >
          Add Product
        </UButton>
      </div>
    </div>

    <!-- ── Loading skeleton ── -->
    <div
      v-if="productStore.isLoading"
      class="space-y-3"
    >
      <USkeleton class="h-12 w-full rounded-2xl" />
      <USkeleton class="h-16 w-full rounded-2xl" />
      <USkeleton class="h-16 w-full rounded-2xl" />
      <USkeleton class="h-16 w-full rounded-2xl" />
    </div>

    <template v-else>
      <!-- ── Empty state ── -->
      <div
        v-if="productStore.products.length === 0"
        class="flex flex-col items-center justify-center py-20 bg-neutral-900 border border-neutral-800 rounded-3xl text-center space-y-6"
      >
        <div class="relative">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <UIcon
              name="i-lucide-shopping-bag"
              class="w-10 h-10 text-primary"
            />
          </div>
          <span class="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        </div>

        <div class="space-y-2 max-w-sm">
          <h2 class="text-xl font-bold text-white">
            Your catalog is empty
          </h2>
          <p class="text-neutral-400 text-sm leading-relaxed">
            Add products manually or import from WooCommerce to train
            your AI sales agents.
          </p>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <UButton
            leading-icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            size="lg"
            @click="isWooOpen = true"
          >
            Import from WooCommerce
          </UButton>
          <UButton
            leading-icon="i-lucide-plus"
            size="lg"
            @click="isAddOpen = true"
          >
            Add Your First Product
          </UButton>
        </div>
      </div>

      <!-- ── Data table ── -->
      <div
        v-else
        class="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden"
      >
        <!-- Row count -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800">
          <p class="text-xs text-neutral-500 font-medium">
            {{ productStore.products.length }}
            {{ productStore.products.length === 1 ? 'product' : 'products' }} in catalog
          </p>
        </div>

        <!--
          UTable:
            :data    → the reactive products array from Pinia
            :columns → column definitions using h() for rich cell rendering
            :loading → shows a built-in loading animation during fetchProducts()
            sticky   → freezes the header on scroll for long lists
        -->
        <UTable
          :data="productStore.products"
          :columns="columns"
          :loading="productStore.isLoading"
          sticky
          class="max-h-150"
          :ui="{
            thead: 'bg-neutral-900/80',
            tbody: 'divide-y divide-neutral-800/50',
            tr: 'hover:bg-neutral-800/30 transition-colors duration-150',
            th: 'text-xs font-bold uppercase tracking-wider text-neutral-500 py-3.5',
            td: 'py-3.5 text-sm'
          }"
        />
      </div>
    </template>

    <!-- ── Mounted overlays ── -->
    <ProductsAddProductSlideover v-model="isAddOpen" />
    <ProductsWooCommerceModal v-model="isWooOpen" />
  </div>
</template>
