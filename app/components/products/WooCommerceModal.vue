<!-- app/components/products/WooCommerceModal.vue -->
<script setup lang="ts">
import { z } from "zod"
import type { FormSubmitEvent } from "#ui/types"
import { useProductStore } from "~/stores/product"

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

const productStore = useProductStore()
const toast = useToast()

// ── Reactive state object for UForm ──
const state = reactive({
  storeUrl: "",
  consumerKey: "",
  consumerSecret: ""
})

// ── Zod schema ──
const schema = z.object({
  storeUrl: z
    .string()
    .min(1, "Store URL is required")
    .url("Please enter a valid URL (e.g., https://my-store.com)"),
  consumerKey: z
    .string()
    .min(1, "Consumer Key is required")
    .startsWith("ck_", "Consumer Key must start with ck_"),
  consumerSecret: z
    .string()
    .min(1, "Consumer Secret is required")
    .startsWith("cs_", "Consumer Secret must start with cs_")
})

type SyncSchema = z.output<typeof schema>

// ── Reset form fields ──
function resetForm() {
  state.storeUrl = ""
  state.consumerKey = ""
  state.consumerSecret = ""
}

// ── Close handler — also resets the form ──
function handleClose() {
  if (productStore.isSyncing) return // prevent close mid-sync
  resetForm()
  emit("update:modelValue", false)
}

// ── Submit handler ──
async function handleSync(event: FormSubmitEvent<SyncSchema>) {
  try {
    await productStore.importWooCommerce({
      storeUrl: event.data.storeUrl,
      consumerKey: event.data.consumerKey,
      consumerSecret: event.data.consumerSecret
    })

    toast.add({
      title: "Sync Complete",
      description: "WooCommerce products have been imported successfully.",
      color: "success",
      icon: "i-lucide-circle-check"
    })

    handleClose()
  } catch (err: unknown) {
    // If the store doesn't already show a toast on error, show one here
    toast.add({
      title: "Sync Failed",
      description: err instanceof Error ? err.message : "Failed to import products. Please check your credentials.",
      color: "error",
      icon: "i-lucide-circle-x"
    })
  }
}
</script>

<template>
  <!--
    v4 UModal API:
      :open        → controls visibility (replaces v-model on the component itself)
      @update:open → syncs close events back to the parent's modelValue
      :dismissible → false while syncing to prevent accidental close mid-import
      #content     → full custom content slot (disables the built-in header/close button)
  -->
  <UModal
    :open="props.modelValue"
    :dismissible="!productStore.isSyncing"
    :ui="{ content: 'bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl sm:max-w-lg' }"
    @update:open="(val) => { if (!val) handleClose() }"
  >
    <template #content>
      <div class="p-6 space-y-5 text-neutral-100">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="shrink-0 p-2.5 bg-primary/10 rounded-xl">
              <UIcon
                name="i-lucide-refresh-cw"
                class="w-5 h-5 text-primary"
                :class="{ 'animate-spin': productStore.isSyncing }"
              />
            </div>
            <div>
              <h2 class="text-base font-bold text-white">
                Sync WooCommerce Store
              </h2>
              <p class="text-xs text-neutral-400 mt-0.5">
                Import products and generate vector embeddings automatically.
              </p>
            </div>
          </div>

          <!-- Manual close button — disabled while syncing -->
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="productStore.isSyncing"
            class="-mt-1 -mr-1 shrink-0"
            aria-label="Close modal"
            @click="handleClose"
          />
        </div>

        <USeparator />

        <!-- Syncing progress indicator -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="productStore.isSyncing"
            class="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="w-4 h-4 text-primary animate-spin shrink-0"
            />
            <div>
              <p class="text-sm font-semibold text-primary">
                Import in progress…
              </p>
              <p class="text-xs text-neutral-400">
                This may take a moment. Please don't close this window.
              </p>
            </div>
          </div>
        </Transition>

        <!--
          UForm handles Zod schema validation.
          Fields are disabled during sync to prevent edits mid-import.
        -->
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="handleSync"
        >
          <UFormField
            name="storeUrl"
            label="WooCommerce Store URL"
            required
            size="lg"
            help="The root URL of your WooCommerce store."
          >
            <UInput
              v-model="state.storeUrl"
              type="url"
              placeholder="https://my-store.com"
              leading-icon="i-lucide-link"
              size="lg"
              class="w-full"
              :disabled="productStore.isSyncing"
              :ui="{ base: 'bg-neutral-800 border-neutral-700' }"
            />
          </UFormField>

          <UFormField
            name="consumerKey"
            label="Consumer Key"
            required
            size="lg"
            help="Found in WooCommerce → Settings → Advanced → REST API."
          >
            <UInput
              v-model="state.consumerKey"
              placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              leading-icon="i-lucide-key-round"
              size="lg"
              class="w-full"
              :disabled="productStore.isSyncing"
              :ui="{ base: 'bg-neutral-800 border-neutral-700' }"
            />
          </UFormField>

          <UFormField
            name="consumerSecret"
            label="Consumer Secret"
            required
            size="lg"
          >
            <UInput
              v-model="state.consumerSecret"
              type="password"
              placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              leading-icon="i-lucide-lock"
              size="lg"
              class="w-full"
              :disabled="productStore.isSyncing"
              :ui="{ base: 'bg-neutral-800 border-neutral-700' }"
            />
          </UFormField>

          <USeparator />

          <!-- Footer actions -->
          <div class="flex items-center justify-end gap-3 pt-1">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="lg"
              :disabled="productStore.isSyncing"
              @click="handleClose"
            >
              Cancel
            </UButton>

            <UButton
              type="submit"
              size="lg"
              :loading="productStore.isSyncing"
              :disabled="productStore.isSyncing"
              leading-icon="i-lucide-refresh-cw"
            >
              {{ productStore.isSyncing ? 'Importing...' : 'Start Import' }}
            </UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
