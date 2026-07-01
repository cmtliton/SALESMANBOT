<!-- app/components/billing/DepositHistory.vue -->
<script setup lang="ts">
import { h, resolveComponent } from "vue"
import type { TableColumn } from "@nuxt/ui"
import { useBillingStore } from "~/stores/billing"

const billingStore = useBillingStore()

const METHOD_LABELS: Record<string, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket"
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

// ── UTable column definitions ──
const UBadge = resolveComponent("UBadge")
const UIcon = resolveComponent("UIcon")

type Deposit = (typeof billingStore.deposits)[number]

// Map each DepositStatus to a UBadge color token
const STATUS_COLOR: Record<string, "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error"
}

const columns: TableColumn<Deposit>[] = [
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2" }, [
        h(UIcon, { name: "i-lucide-smartphone", class: "w-3.5 h-3.5 text-neutral-500 shrink-0" }),
        h("span", { class: "font-semibold text-neutral-200" },
          METHOD_LABELS[row.original.method] ?? row.original.method
        )
      ])
  },
  {
    accessorKey: "senderNumber",
    header: "Sender",
    cell: ({ row }) =>
      h("span", { class: "font-mono text-neutral-300 tabular-nums" },
        row.original.senderNumber
      )
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) =>
      h("span", { class: "font-bold text-neutral-100 tabular-nums" },
        `৳${Number(row.original.amount).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`
      )
  },
  {
    accessorKey: "transactionId",
    header: "TxID",
    cell: ({ row }) =>
      h("span", {
        class: "font-mono text-neutral-400 select-all text-[11px] tracking-wide",
        title: "Double-click to select"
      }, row.original.transactionId)
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) =>
      h("span", { class: "text-neutral-400 tabular-nums" },
        formatDate(row.original.createdAt)
      )
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) =>
      h(UBadge, {
        label: row.original.status.charAt(0) + row.original.status.slice(1).toLowerCase(),
        color: STATUS_COLOR[row.original.status] ?? "neutral",
        variant: "soft",
        size: "sm"
      }),
    meta: { class: { th: "text-right", td: "text-right" } }
  }
]
</script>

<template>
  <div class="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-xl flex flex-col gap-5 text-neutral-100">
    <!-- Header -->
    <div class="flex items-center gap-3 pb-4 border-b border-neutral-800">
      <div class="p-2 bg-primary/10 rounded-xl shrink-0">
        <UIcon
          name="i-lucide-clock"
          class="w-5 h-5 text-primary"
        />
      </div>
      <div>
        <h3 class="text-sm font-bold text-white">
          Deposit History
        </h3>
        <p class="text-xs text-neutral-400 mt-0.5">
          Track and audit all your manual payment submissions.
        </p>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="billingStore.deposits.length === 0"
      class="flex flex-col items-center justify-center py-14 gap-3 text-center"
    >
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-neutral-800">
        <UIcon
          name="i-lucide-inbox"
          class="w-7 h-7 text-neutral-600"
        />
      </div>
      <div class="space-y-1">
        <p class="text-sm font-semibold text-neutral-400">
          No deposits yet
        </p>
        <p class="text-xs text-neutral-600">
          Your deposit submissions will appear here after you submit a proof.
        </p>
      </div>
    </div>

    <!--
      UTable:
        :data    → reactive deposits array from Pinia
        :columns → rich cell definitions via h() + resolveComponent()
        sticky   → freezes the header when the list grows long
    -->
    <div
      v-else
      class="overflow-x-auto -mx-1"
    >
      <UTable
        :data="billingStore.deposits"
        :columns="columns"
        sticky
        class="max-h-105"
        :ui="{
          thead: 'bg-neutral-900/80',
          tbody: 'divide-y divide-neutral-800/40',
          tr: 'hover:bg-neutral-800/25 transition-colors duration-150',
          th: 'text-[11px] font-bold uppercase tracking-wider text-neutral-500 py-3',
          td: 'py-3 text-xs'
        }"
      />
    </div>
  </div>
</template>
