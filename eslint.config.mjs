// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  // Your custom configs here
  {
    rules: {
      // Nuxt-এ file-based routing এর জন্য index.vue নাম রাখা বাধ্যতামূলক,
      // তাই এই রুলসটি বন্ধ করে দেওয়া হলো।
      "vue/multi-word-component-names": "off",

      // আপনার যদি আগে থেকে অন্য কোনো রুলস থাকে, সেগুলো এভাবেই থাকবে
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": "warn",
      "@stylistic/quotes": ["error", "double"],
      "@stylistic/comma-dangle": "off",
      "@stylistic/semi": "off",
    },
  },
);
