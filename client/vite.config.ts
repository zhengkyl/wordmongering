import preact from "@preact/preset-vite";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact(), UnoCSS()],
  server: {
    proxy: {
      "/api": `http://localhost:${process.env.API_PORT ?? 2704}`,
    },
  },
});
