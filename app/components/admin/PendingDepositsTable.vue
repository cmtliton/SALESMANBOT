<!-- app/components/admin/PendingDepositsTable.vue -->
<script setup lang="ts">
import { h, resolveComponent } from "vue"
import type { TableColumn } from "@nuxt/ui"
import { useBillingStore } from "~/stores/billing"

const billingStore = useBillingStore()
const toast = useToast()

const processingId = ref<string | null>(null)
const actionType = ref<"APPROVE" | "REJECT" | null>(null)

const isProcessing = (id: string, type: "APPROVE" | "REJECT") =>
  processingId.value === id && actionType.value === type

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  })
}

const METHOD_LABEL: Record<string, string> = {
  BKASH: "bKash", NAGAD: "Nagad", ROCKET: "Rocket"
}
const METHOD_COLOR: Record<string, "secondary" | "warning" | "info"> = {
  BKASH: "secondary", NAGAD: "warning", ROCKET: "info"
}

async function handleApprove(id: string, orgName: string) {
  processingId.value = id
  actionType.value = "APPROVE"
  try {
    await billingStore.approveDeposit(id)
    toast.add({
      title: "Transaction Approved",
      description: `Wallet credited for "${orgName}".`,
      color: "success", icon: "i-lucide-circle-check"
    })
  } catch (err: unknown) {
    toast.add({
      title: "Approval Failed",
      description: err instanceof Error ? err.message : "Something went wrong.",
      color: "error", icon: "i-lucide-circle-x"
    })
  } finally {
    processingId.value = null
    actionType.value = null
  }
}

async function handleReject(id: string, orgName: string) {
  if (!confirm(`Reject deposit for "${orgName}"?\n\nThis cannot be undone.`)) return
  processingId.value = id
  actionType.value = "REJECT"
  try {
    await billingStore.rejectDeposit(id)
    toast.add({
      title: "Transaction Rejected",
      description: `Deposit for "${orgName}" was rejected.`,
      color: "warning", icon: "i-lucide-ban"
    })
  } catch (err: unknown) {
    toast.add({
      title: "Action Failed",
      description: err instanceof Error ? err.message : "Something went wrong.",
      color: "error", icon: "i-lucide-circle-x"
    })
  } finally {
    processingId.value = null
    actionType.value = null
  }
}

// ── Desktop UTable columns ──
const UBadge = resolveComponent("UBadge")
const UButton = resolveComponent("UButton")

type PendingDeposit = (typeof billingStore.pendingDeposits)[number]

const columns: TableColumn<PendingDeposit>[] = [
  {
    accessorKey: "organization",
    header: "Workspace",
    cell: ({ row }) =>
      h("span", { class: "font-bold text-neutral-200 text-sm" },
        row.original.organization?.name ?? "Unknown"
      )
  },
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) =>
      h(UBadge, {
        label: METHOD_LABEL[row.original.method] ?? row.original.method,
        color: METHOD_COLOR[row.original.method] ?? "neutral",
        variant: "soft", size: "sm"
      })
  },
  {
    accessorKey: "senderNumber",
    header: "Sender",
    cell: ({ row }) =>
      h("span", { class: "font-mono text-neutral-300 tabular-nums text-xs" },
        row.original.senderNumber
      )
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) =>
      h("span", { class: "font-bold text-neutral-100 tabular-nums text-sm" },
        `৳${Number(row.original.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      )
  },
  {
    accessorKey: "transactionId",
    header: "TxID",
    cell: ({ row }) =>
      h("span", { class: "font-mono text-primary font-bold uppercase select-all text-xs tracking-wide" },
        row.original.transactionId
      )
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) =>
      h("span", { class: "text-neutral-500 text-xs tabular-nums" },
        formatDate(row.original.createdAt)
      )
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const id = row.original.id
      const orgName = row.original.organization?.name ?? "Unknown"
      return h("div", { class: "flex items-center justify-end gap-2" }, [
        h(UButton, {
          icon: "i-lucide-x", color: "error", variant: "outline", size: "sm",
          loading: isProcessing(id, "REJECT"),
          disabled: processingId.value !== null,
          onClick: () => handleReject(id, orgName)
        }),
        h(UButton, {
          icon: "i-lucide-check", color: "success", size: "sm",
          loading: isProcessing(id, "APPROVE"),
          disabled: processingId.value !== null,
          onClick: () => handleApprove(id, orgName)
        })
      ])
    },
    meta: { class: { th: "w-24", td: "text-right" } }
  }
]
</script>

<template>
  <div class="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 md:p-6 shadow-xl text-neutral-100">
    <!-- ── Empty state ── -->
    <div
      v-if="billingStore.pendingDeposits.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center gap-4"
    >
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
        <UIcon
          name="i-lucide-circle-check"
          class="w-8 h-8 text-success"
        />
      </div>
      <div class="space-y-1">
        <h3 class="text-base font-bold text-neutral-200">
          All clear!
        </h3>
        <p class="text-xs text-neutral-500">
          No pending transactions to verify.
        </p>
      </div>
    </div>

    <template v-else>
      <!-- ── Mobile card list (shown below md) ── -->
      <div class="flex flex-col gap-3 md:hidden">
        <div
          v-for="item in billingStore.pendingDeposits"
          :key="item.id"
          class="bg-neutral-800/40 border border-neutral-700/50 rounded-2xl p-4 space-y-3"
        >
          <!-- Row 1: workspace + method badge -->
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-neutral-100 text-sm truncate">
              {{ item.organization?.name ?? 'Unknown Workspace' }}
            </span>
            <UBadge
              :label="METHOD_LABEL[item.method] ?? item.method"
              :color="METHOD_COLOR[item.method] ?? 'neutral'"
              variant="soft"
              size="sm"
              class="shrink-0"
            />
          </div>

          <!-- Row 2: amount + date -->
          <div class="flex items-center justify-between text-xs text-neutral-400">
            <span class="font-bold text-neutral-100 tabular-nums text-base">
              ৳{{ Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
            </span>
            <span class="tabular-nums">{{ formatDate(item.createdAt) }}</span>
          </div>

          <!-- Row 3: sender + TxID -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            <div class="flex items-center gap-1.5 text-neutral-400">
              <UIcon
                name="i-lucide-smartphone"
                class="w-3.5 h-3.5 shrink-0"
              />
              <span class="font-mono tabular-nums">{{ item.senderNumber }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-neutral-400">
              <UIcon
                name="i-lucide-key-round"
                class="w-3.5 h-3.5 shrink-0"
              />
              <span class="font-mono font-bold text-primary uppercase select-all tracking-wide">
                {{ item.transactionId }}
              </span>
            </div>
          </div>

          <!-- Row 4: action buttons -->
          <div class="flex items-center gap-2 pt-1 border-t border-neutral-700/50">
            <UButton
              icon="i-lucide-x"
              color="error"
              variant="outline"
              size="sm"
              block
              :loading="isProcessing(item.id, 'REJECT')"
              :disabled="processingId !== null"
              @click="handleReject(item.id, item.organization?.name ?? 'Unknown')"
            >
              Reject
            </UButton>
            <UButton
              icon="i-lucide-check"
              color="success"
              size="sm"
              block
              :loading="isProcessing(item.id, 'APPROVE')"
              :disabled="processingId !== null"
              @click="handleApprove(item.id, item.organization?.name ?? 'Unknown')"
            >
              Approve
            </UButton>
          </div>
        </div>
      </div>

      <!-- ── Desktop UTable (hidden below md) ── -->
      <div class="hidden md:block overflow-x-auto -mx-1">
        <UTable
          :data="billingStore.pendingDeposits"
          :columns="columns"
          sticky
          class="max-h-130"
          :ui="{
            thead: 'bg-neutral-900/80',
            tbody: 'divide-y divide-neutral-800/50',
            tr: 'hover:bg-neutral-800/25 transition-colors duration-150',
            th: 'text-[11px] font-bold uppercase tracking-wider text-neutral-500 py-3.5',
            td: 'py-3.5 text-sm'
          }"
        />
      </div>
    </template>
  </div>
</template>
