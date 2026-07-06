import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import expressiveCode from "astro-expressive-code";

export default defineConfig({
  output: "static",
  site: "https://lemonhy-blog.huangyuan0315.workers.dev",
  integrations: [
    expressiveCode({
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) =>
        theme.type === "dark" ? ".dark" : ':root:not(.dark)',
    }),
    svelte(),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    remarkPlugins: [],
  },
});
