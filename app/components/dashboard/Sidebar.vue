<!-- app/components/dashboard/Sidebar.vue -->
<script setup lang="ts">
import { useAuthStore } from "~/stores/auth";
// isOpen controls the mobile slideover; close emits when it dismisses
const props = defineProps<{
  isOpen: boolean
}>();

const emit = defineEmits<{
  close: []
}>();

const authStore = useAuthStore();
const route = useRoute();
const { navigationItems } = useNavigation();

function isActive(to: string) {
  if (to === "/dashboard") return route.path === "/dashboard";
  return route.path.startsWith(to);
}
</script>

<template>
  <div>
    <!-- ── Desktop Sidebar (hidden on mobile) ── -->
    <aside
      class="hidden md:flex flex-col h-screen w-64 bg-neutral-900 border-r border-neutral-800 fixed left-0 top-0 z-20"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center px-6 border-b border-neutral-800">
        <NuxtLink
          to="/dashboard"
          class="flex items-center gap-2.5"
        >
          <div
            class="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.45)]"
          >
            <UIcon
              name="i-lucide-cpu"
              class="w-4 h-4 text-white"
            />
          </div>
          <span
            class="text-sm font-black tracking-widest text-primary drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]"
          >
            SALESMAN<span class="text-white">BOT</span>
          </span>
        </NuxtLink>
      </div>

      <!-- Nav links -->
      <nav class="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors duration-150"
          :class="
            isActive(item.to)
              ? 'bg-primary/10 text-primary font-semibold border-l-4 border-primary rounded-l-none pl-2'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border-l-4 border-transparent rounded-l-none pl-2'
          "
        >
          <UIcon
            :name="item.icon"
            class="w-4.5 h-4.5 shrink-0"
          />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- Bottom: signed-in user hint -->
      <div class="px-4 py-4 border-t border-neutral-800">
        <div
          class="flex items-center gap-3 px-3 py-2 rounded-xl bg-neutral-800/40"
        >
          <UAvatar
            :text="authStore.user?.name?.charAt(0).toUpperCase() ?? 'U'"
            color="primary"
            size="xs"
          />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-neutral-200 truncate">
              {{ authStore.user?.name || authStore.user?.email || "User" }}
            </p>
            <p class="text-[10px] text-neutral-500 truncate">
              {{ authStore.user?.email }}
            </p>
          </div>
        </div>
      </div>
    </aside>

    <!-- ── Mobile Slideover (visible on mobile only) ──
         v4 USlideover does NOT use v-model on the wrapper.
         Instead, control open state via v-model:open on the component itself.
         The default slot is the trigger — we pass nothing since the hamburger
         button lives in the Navbar. We use the programmatic open pattern by
         watching the isOpen prop and calling open()/close() on the component ref.
    -->
    <USlideover
      :open="props.isOpen"
      side="left"
      :ui="{
        content: 'bg-neutral-900 border-r border-neutral-800 w-64 sm:w-72'
      }"
      class="md:hidden"
      @update:open="
        (val) => {
          if (!val) emit('close');
        }
      "
    >
      <!-- #content slot renders the full slideover body -->
      <template #content>
        <div class="flex flex-col h-full">
          <!-- Mobile logo header -->
          <div
            class="h-16 flex items-center justify-between px-6 border-b border-neutral-800 shrink-0"
          >
            <NuxtLink
              to="/dashboard"
              class="flex items-center gap-2.5"
              @click="emit('close')"
            >
              <div
                class="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.45)]"
              >
                <UIcon
                  name="i-lucide-cpu"
                  class="w-4 h-4 text-white"
                />
              </div>
              <span
                class="text-sm font-black tracking-widest text-primary drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]"
              >
                SALESMAN<span class="text-white">BOT</span>
              </span>
            </NuxtLink>

            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Close sidebar"
              @click="emit('close')"
            />
          </div>

          <!-- Mobile nav links -->
          <nav class="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
            <NuxtLink
              v-for="item in navigationItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors duration-150"
              :class="
                isActive(item.to)
                  ? 'bg-primary/10 text-primary font-semibold border-l-4 border-primary rounded-l-none pl-2'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border-l-4 border-transparent rounded-l-none pl-2'
              "
              @click="emit('close')"
            >
              <UIcon
                :name="item.icon"
                class="w-4.5 h-4.5 shrink-0"
              />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>

          <!-- Mobile bottom user hint -->
          <div class="px-4 py-4 border-t border-neutral-800 shrink-0">
            <div
              class="flex items-center gap-3 px-3 py-2 rounded-xl bg-neutral-800/40"
            >
              <UAvatar
                :text="authStore.user?.name?.charAt(0).toUpperCase() ?? 'U'"
                color="primary"
                size="xs"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-neutral-200 truncate">
                  {{ authStore.user?.name || authStore.user?.email || "User" }}
                </p>
                <p class="text-[10px] text-neutral-500 truncate">
                  {{ authStore.user?.email }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
