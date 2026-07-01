// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@pinia/nuxt", "@nuxt/eslint", "@nuxt/ui", "@nuxtjs/supabase"],
  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    openaiApiKey: "",
    metaAppSecret: "",
    public: {
      supabaseUrl: "",
      supabaseKey: "",
      metaAppId: "",
      metaVerifyToken: "",
    },
  },
  routeRules: {
    "/": { prerender: true },
    "/dashboard/**": { ssr: true },
  },

  compatibilityDate: "2025-01-15",
  vite: {
    optimizeDeps: {
      include: ["debug", "zod"],
    },
    server: {
      allowedHosts: ["localhost", "last-penalize-hurdle.ngrok-free.dev", "salesmanbot.netlify.app"],
    }
  },
  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs"
      }
    }
  },
  supabase: {
    redirect: false,
    types: "~/types/database.types.ts",
  },
});
