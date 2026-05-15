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
  shortcuts: {
    "btn-orange": "bg-orange-500 @hover:bg-orange-500/80 !active:bg-orange-500/60 text-white",
    "btn-sec": "bg-stone-200 @hover:bg-stone-300/60 !active:bg-stone-300/80",
    "btn-ghost": "rounded-xl font-semibold @hover:bg-stone-200/80 !active:bg-stone-300/80",
    "btn-icon": "p-2 bg-orange-100 @hover:bg-orange-200/60 !active:bg-orange-200/80 rounded-xl",
    "btn-tab": "px-2 py-1 rounded-lg font-semibold",
    "btn-tab-active": "bg-orange-200 @hover:bg-orange-300 !active:bg-orange-400",
    btn: "h-10 px-3 inline-flex sjustify-center items-center rounded-lg sfont-semibold text-center",
    "btn-lg":
      "h-14 px-3 inline-flex sjustify-center items-center rounded-xl sfont-bold text-xl text-center",
  },
  variants: [],
});
