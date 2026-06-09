import preact from "@preact/preset-vite";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

const apiPort = process.env.API_PORT;
if (!apiPort) {
  throw new Error("API_PORT not set");
}

export default defineConfig({
  plugins: [preact(), UnoCSS()],
  server: {
    proxy: {
      "/api": `http://localhost:${apiPort}`,
    },
  },
});
