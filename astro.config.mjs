import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: process.env.SITE_URL ?? "https://masawang.github.io",
  base: process.env.BASE_PATH ?? "/mybook-web",
  output: "static",
  compressHTML: true,
  integrations: [sitemap()],
  build: { format: "directory" },
});
