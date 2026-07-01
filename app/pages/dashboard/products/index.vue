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

async function handleDelete(id: string, title: string) {
  if (!confirm(`Delete "${title}"?\n\nThis will also remove its vector embeddings and cannot be undone.`)) return
  try {
    await productStore.deleteProduct(id)
    toast.add({ title: "Product Deleted", description: `"${title}" was removed from your catalog.`, color: "success", icon: "i-lucide-circle-check" })
  } catch (err: unknown) {
    toast.add({ title: "Delete Failed", description: err instanceof Error ? err.message : "Something went wrong.", color: "error", icon: "i-lucide-circle-x" })
  }
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return ""
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

// ── UTable column definitions ──
const UBadge = resolveComponent("UBadge")
const UButton = resolveComponent("UButton")
const UIcon = resolveComponent("UIcon")

type Product = (typeof productStore.products)[number]

const columns: TableColumn<Product>[] = [
  {
    id: "product",
    header: "Product",
    cell: ({ row }) => {
      const p = row.original
      return h("div", { class: "flex items-center gap-3" }, [
        h("div", { class: "h-11 w-11 rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden shrink-0 flex items-center justify-center" },
          p.images?.[0]
            ? [h("img", { src: p.images[0], alt: p.title, class: "h-full w-full object-cover" })]
            : [h(UIcon, { name: "i-lucide-image", class: "w-5 h-5 text-neutral-600" })]
        ),
        h("div", { class: "min-w-0" }, [
          h("p", { class: "text-sm font-semibold text-neutral-100 truncate max-w-[220px]" }, p.title),
          h("p", { class: "text-xs text-neutral-500 truncate max-w-[220px] mt-0.5" }, stripHtml(p.description))
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
        `৳${Number(row.original.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
  },
  {
    accessorKey: "stock",
    header: "Stock",
    cell: ({ row }) => {
      const s = row.original.stock
      if (s === 0) return h(UBadge, { color: "error", variant: "soft", label: "Out of Stock" })
      if (s < 10) return h(UBadge, { color: "warning", variant: "soft", label: `Low — ${s} left` })
      return h(UBadge, { color: "success", variant: "soft", label: `In Stock (${s})` })
    }
  },
  {
    accessorKey: "wooCommerceId",
    header: "Source",
    cell: ({ row }) => row.original.wooCommerceId
      ? h(UBadge, { color: "info", variant: "soft", leadingIcon: "i-lucide-globe", label: "WooCommerce" })
      : h(UBadge, { color: "neutral", variant: "soft", leadingIcon: "i-lucide-pencil", label: "Manual" })
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      h(UButton, {
        icon: "i-lucide-trash-2", color: "error", variant: "ghost", size: "sm",
        ariaLabel: "Delete product",
        onClick: () => handleDelete(row.original.id, row.original.title)
      }),
    meta: { class: { th: "w-12", td: "text-right" } }
  }
]
</script>

<template>
  <div class="space-y-4 md:space-y-6">
    <!-- ── Page header ── -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-neutral-900">
      <div class="space-y-1">
        <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Product Catalog
        </h1>
        <p class="text-neutral-400 text-sm max-w-lg">
          Manage your inventory, import from WooCommerce, and configure your AI agent knowledge base.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
        <UButton
          leading-icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          size="lg"
          block
          class="sm:w-auto"
          @click="isWooOpen = true"
        >
          Sync WooCommerce
        </UButton>
        <UButton
          leading-icon="i-lucide-plus"
          size="lg"
          block
          class="sm:w-auto"
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
        class="flex flex-col items-center justify-center py-14 sm:py-20 bg-neutral-900 border border-neutral-800 rounded-3xl text-center space-y-6 px-6"
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
            Add products manually or import from WooCommerce to train your AI sales agents.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <UButton
            leading-icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            size="lg"
            block
            class="sm:w-auto"
            @click="isWooOpen = true"
          >
            Import from WooCommerce
          </UButton>
          <UButton
            leading-icon="i-lucide-plus"
            size="lg"
            block
            class="sm:w-auto"
            @click="isAddOpen = true"
          >
            Add Your First Product
          </UButton>
        </div>
      </div>

      <!-- ── Products view ── -->
      <template v-else>
        <!-- Row count -->
        <p class="text-xs text-neutral-500 font-medium px-1">
          {{ productStore.products.length }}
          {{ productStore.products.length === 1 ? 'product' : 'products' }} in catalog
        </p>

        <!-- ── Mobile: Card list (below sm) ── -->
        <div class="flex flex-col gap-3 sm:hidden w-xs">
          <div
            v-for="product in productStore.products"
            :key="product.id"
            class="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-start gap-3"
          >
            <!-- Thumbnail -->
            <div class="h-14 w-14 rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shrink-0 flex items-center justify-center">
              <img
                v-if="product.images?.[0]"
                :src="product.images[0]"
                :alt="product.title"
                class="h-full w-full object-cover"
              >
              <UIcon
                v-else
                name="i-lucide-image"
                class="w-5 h-5 text-neutral-600"
              />
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0 space-y-1.5">
              <p class="text-sm font-bold text-neutral-100 truncate">
                {{ product.title }}
              </p>
              <p class="text-xs text-neutral-500 line-clamp-1">
                {{ stripHtml(product.description) }}
              </p>

              <div class="flex items-center gap-2 flex-wrap pt-0.5">
                <span class="text-sm font-black text-neutral-200 tabular-nums">
                  ৳{{ Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </span>

                <!-- ✅ Fixed: use semantic color tokens (error/warning/success/info) -->
                <UBadge
                  v-if="product.stock === 0"
                  color="error"
                  variant="soft"
                  label="Out of Stock"
                  size="sm"
                />
                <UBadge
                  v-else-if="product.stock < 10"
                  color="warning"
                  variant="soft"
                  :label="`Low — ${product.stock} left`"
                  size="sm"
                />
                <UBadge
                  v-else
                  color="success"
                  variant="soft"
                  :label="`In Stock (${product.stock})`"
                  size="sm"
                />

                <UBadge
                  v-if="product.wooCommerceId"
                  color="info"
                  variant="soft"
                  leading-icon="i-lucide-globe"
                  label="WooCommerce"
                  size="sm"
                />
                <UBadge
                  v-else
                  color="neutral"
                  variant="soft"
                  leading-icon="i-lucide-pencil"
                  label="Manual"
                  size="sm"
                />
              </div>
            </div>

            <!-- Delete -->
            <!-- ✅ Fixed: color="error" not color="red" -->
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              aria-label="Delete product"
              class="shrink-0"
              @click="handleDelete(product.id, product.title)"
            />
          </div>
        </div>

        <!-- ── Desktop: Table (sm and above) ── -->
        <div class="hidden sm:block bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
          <!-- ✅ overflow-x-auto confines horizontal scroll to this box only -->
          <div class="overflow-x-auto">
            <UTable
              :data="productStore.products"
              :columns="columns"
              :loading="productStore.isLoading"
              sticky
              class="max-h-150 min-w-160"
              :ui="{
                thead: 'bg-neutral-900/80',
                tbody: 'divide-y divide-neutral-800/50',
                tr: 'hover:bg-neutral-800/30 transition-colors duration-150',
                th: 'text-xs font-bold uppercase tracking-wider text-neutral-500 py-3.5',
                td: 'py-3.5 text-sm'
              }"
            />
          </div>
        </div>
      </template>
    </template>

    <!-- ── Mounted overlays ── -->
    <ProductsAddProductSlideover v-model="isAddOpen" />
    <ProductsWooCommerceModal v-model="isWooOpen" />
  </div>
</template>
