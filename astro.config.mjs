// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vue from "@astrojs/vue";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  integrations: [vue()],
  vite: {
    plugins: [tailwindcss({
      optimize: {
        minify: true
      }
    })],
    resolve: {
      tsconfigPaths: true
    }
  },

  fonts: [{
    provider: fontProviders.fontsource(),
    name: "Varela Round",
    cssVariable: "--font-varela-round",
  }],

  adapter: cloudflare(),
});