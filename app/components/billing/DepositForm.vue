<!-- app/components/billing/DepositForm.vue -->
<script setup lang="ts">
import { z } from "zod"
import type { FormSubmitEvent } from "#ui/types"
import { useBillingStore } from "~/stores/billing"

const billingStore = useBillingStore()
const toast = useToast()

const paymentMethods = [
  { label: "bKash (Send Money)", value: "BKASH" },
  { label: "Nagad (Send Money)", value: "NAGAD" },
  { label: "Rocket (Send Money)", value: "ROCKET" }
]

const state = reactive({
  method: "BKASH" as "BKASH" | "NAGAD" | "ROCKET",
  senderNumber: "",
  transactionId: "",
  amount: undefined as number | undefined
})

// ── Zod schema ──
const schema = z.object({
  method: z.enum(["BKASH", "NAGAD", "ROCKET"], {
    error: "Please select a payment gateway"
  }),
  senderNumber: z
    .string()
    .min(1, "Sender phone number is required")
    .regex(
      /^(?:\+8801|01)[3-9]\d{8}$/,
      "Please enter a valid Bangladeshi phone number"
    ),
  transactionId: z
    .string()
    .min(1, "Transaction ID is required")
    .min(8, "Transaction ID must be at least 8 characters")
    .max(15, "Transaction ID must be under 15 characters")
    .regex(
      /^[A-Z0-9]{8,15}$/,
      "Invalid format — uppercase alphanumeric only (e.g. 9H7S9XJS)"
    ),
  amount: z
    .number({ error: "Amount is required and must be a number" })
    .min(100, "Minimum deposit amount is BDT 100")
})

type DepositSchema = z.output<typeof schema>

// Auto-uppercase the transaction ID as the user types
watch(
  () => state.transactionId,
  (val) => { state.transactionId = val.toUpperCase() }
)

async function handleSubmit(event: FormSubmitEvent<DepositSchema>) {
  try {
    await billingStore.submitDeposit({
      method: event.data.method,
      senderNumber: event.data.senderNumber.trim(),
      transactionId: event.data.transactionId.trim(),
      amount: event.data.amount
    })

    toast.add({
      title: "Deposit Submitted",
      description: "Your payment proof has been saved and is pending admin verification.",
      color: "success",
      icon: "i-lucide-circle-check"
    })

    // Reset form
    state.method = "BKASH"
    state.senderNumber = ""
    state.transactionId = ""
    state.amount = undefined
  } catch (err: unknown) {
    toast.add({
      title: "Submission Failed",
      description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      color: "error",
      icon: "i-lucide-circle-x"
    })
  }
}
</script>

<template>
  <div class="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-6 shadow-xl text-neutral-100">
    <!-- Header -->
    <div class="flex items-center gap-3 pb-4 border-b border-neutral-800">
      <div class="p-2 bg-primary/10 rounded-xl shrink-0">
        <UIcon
          name="i-lucide-upload"
          class="w-5 h-5 text-primary"
        />
      </div>
      <div>
        <h3 class="text-sm font-bold text-white">
          Manual Wallet Top-up
        </h3>
        <p class="text-xs text-neutral-400 mt-0.5">
          Submit your transaction details after sending money.
        </p>
      </div>
    </div>

    <!--
      UForm with Zod schema.
      All fields use the required custom :ui styling per spec.
    -->
    <UForm
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="handleSubmit"
    >
      <!-- Payment gateway -->
      <UFormField
        name="method"
        label="Select Gateway"
        required
        size="lg"
      >
        <USelect
          v-model="state.method"
          :items="paymentMethods"
          size="lg"
          class="w-full"
          :disabled="billingStore.isLoading"
          :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
        />
      </UFormField>

      <!-- Sender number -->
      <UFormField
        name="senderNumber"
        label="Sender Number"
        required
        size="lg"
      >
        <UInput
          v-model="state.senderNumber"
          placeholder="e.g., 01712345678"
          leading-icon="i-lucide-phone"
          size="lg"
          class="w-full"
          :disabled="billingStore.isLoading"
          :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
        />
      </UFormField>

      <!-- Transaction ID -->
      <UFormField
        name="transactionId"
        label="Transaction ID (TxID)"
        required
        size="lg"
        help="Uppercase alphanumeric — auto-converted as you type."
      >
        <UInput
          v-model="state.transactionId"
          placeholder="e.g., 9H7S9XJS"
          leading-icon="i-lucide-key-round"
          size="lg"
          class="w-full uppercase"
          :disabled="billingStore.isLoading"
          :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
        />
      </UFormField>

      <!-- Amount -->
      <UFormField
        name="amount"
        label="Amount (BDT)"
        required
        size="lg"
        help="Minimum deposit is BDT 100."
      >
        <UInput
          v-model="state.amount"
          type="number"
          min="100"
          step="1"
          placeholder="e.g., 500"
          leading-icon="i-lucide-banknote"
          size="lg"
          class="w-full"
          :disabled="billingStore.isLoading"
          :ui="{ base: 'bg-neutral-800/60 text-neutral-100 placeholder:text-neutral-500' }"
        />
      </UFormField>

      <!-- Submit -->
      <div class="pt-1">
        <UButton
          type="submit"
          block
          size="lg"
          color="success"
          :loading="billingStore.isLoading"
          :disabled="billingStore.isLoading"
          trailing-icon="i-lucide-send"
        >
          {{ billingStore.isLoading ? 'Submitting...' : 'Submit Deposit Proof' }}
        </UButton>
      </div>
    </UForm>

    <USeparator />

    <!-- Payment instruction box -->
    <div class="bg-neutral-950/60 border border-neutral-800 p-4 rounded-2xl space-y-3">
      <div class="flex items-center gap-1.5">
        <UIcon
          name="i-lucide-info"
          class="w-4 h-4 text-info shrink-0"
        />
        <span class="text-xs font-bold text-info">Payment Guidelines</span>
      </div>

      <p class="text-[11px] text-neutral-400 leading-relaxed">
        Please perform a <strong class="text-neutral-300">Send Money</strong> from your bKash,
        Nagad, or Rocket app to one of our personal accounts below
        <em>before</em> submitting this form.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
        <div class="flex items-center justify-between bg-neutral-900 border border-neutral-800 px-3 py-2.5 rounded-xl">
          <span class="text-neutral-500">bKash (Personal)</span>
          <span class="text-neutral-100 font-bold tracking-wide">01956871403</span>
        </div>
        <div class="flex items-center justify-between bg-neutral-900 border border-neutral-800 px-3 py-2.5 rounded-xl">
          <span class="text-neutral-500">Nagad (Personal)</span>
          <span class="text-neutral-100 font-bold tracking-wide">01956871403</span>
        </div>
      </div>
    </div>
  </div>
</template>
