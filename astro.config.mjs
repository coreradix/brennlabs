// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss({
      optimize: {
        minify: true
      }
    })],
  },
  fonts: [{
    provider: fontProviders.fontsource(),
    name: "Varela Round",
    cssVariable: "--font-varela-round",
  }],
});
