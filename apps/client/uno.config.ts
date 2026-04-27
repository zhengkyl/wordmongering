import { defineConfig, presetWind3, transformerVariantGroup } from "unocss";

export default defineConfig({
  content: {
    pipeline: {
      include: ["**/*.tsx"],
    },
  },
  presets: [presetWind3()],
  transformers: [transformerVariantGroup()],
  theme: {
    colors: {
      background: "#fdf7f1",
    },
  },
});
