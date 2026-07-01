// app/composables/useNavigation.ts
import { computed } from "vue"
import { useRoute } from "vue-router"
import { useAuthStore } from "../stores/auth" // আপনার stores/auth.ts এর আপেক্ষিক পাথ অনুযায়ী

// নেভিগেশন আইটেমের পাবলিক ইন্টারফেস
export interface NavigationItem {
  label: string
  to: string
  icon: string
  active: boolean
}

// রোল রেস্ট্রিকশন সহ ইন্টারনাল ডাটা স্ট্রাকচার
interface RawNavigationItem {
  label: string
  to: string
  icon: string
  roles?: ("OWNER" | "ADMIN" | "MEMBER")[] // ঐচ্ছিক রোল রেস্ট্রিকশন
}

export const useNavigation = () => {
  const route = useRoute()
  const authStore = useAuthStore()

  // ১. ড্যাশবোর্ডের সমস্ত মেন্যু লিঙ্ক ও পারমিশন ম্যাপিং
  const rawItems: RawNavigationItem[] = [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: "i-heroicons-squares-2x2"
    },
    {
      label: "Product Catalog",
      to: "/dashboard/products",
      icon: "i-heroicons-shopping-bag"
    },
    {
      label: "Order Tracking",
      to: "/dashboard/orders",
      icon: "i-heroicons-clipboard-document-list"
    },
    {
      label: "Channel Integration",
      to: "/dashboard/integration",
      icon: "i-heroicons-puzzle-piece"
    },
    {
      label: "Live Chat Inbox",
      to: "/dashboard/inbox",
      icon: "i-heroicons-chat-bubble-left-right"
    },
    {
      label: "Ads Library",
      to: "/dashboard/ads",
      icon: "i-heroicons-megaphone"
    },
    {
      label: "Billing / Wallet",
      to: "/dashboard/billing",
      icon: "i-heroicons-credit-card",
      roles: ["OWNER", "ADMIN"] // শুধুমাত্র OWNER এবং ADMIN এই মেন্যুটি দেখতে পারবে
    },
    {
      label: "Settings",
      to: "/dashboard/settings/ai",
      icon: "i-heroicons-cog-6-tooth",
      roles: ["OWNER", "ADMIN"] // শুধুমাত্র OWNER এবং ADMIN এই মেন্যুটি দেখতে পারবে
    }
  ]

  // ২. ইউজারের রোলের ওপর ভিত্তি করে ডায়নামিক একটিভ স্টেট সহ মেন্যু জেনারেট করা
  const navigationItems = computed<NavigationItem[]>(() => {
    const userRole = authStore.user?.role

    return rawItems
      .filter((item) => {
        // যদি আইটেমটিতে রোল রেস্ট্রিকশন থাকে, তবে ইউজারের রোল পারমিশন চেক করা হচ্ছে
        if (item.roles) {
          return userRole ? item.roles.includes(userRole) : false
        }
        // কোনো রেস্ট্রিকশন না থাকলে সাধারণ কাস্টমার/মেম্বারদের জন্য মেন্যুটি উন্মুক্ত থাকবে
        return true
      })
      .map((item) => {
        // সাব-রাউট ট্র্যাকিং লজিক:
        // /dashboard পেজের ক্ষেত্রে শুধুমাত্র এক্সাক্ট ম্যাচ চেক করবে
        // অন্য পেজগুলোর ক্ষেত্রে (যেমন /dashboard/products/create) সাব-পাথ চেক করে একটিভ রাখবে
        const active = item.to === "/dashboard"
          ? route.path === "/dashboard"
          : route.path.startsWith(item.to)

        return {
          label: item.label,
          to: item.to,
          icon: item.icon,
          active
        }
      })
  })

  return {
    navigationItems
  }
}
