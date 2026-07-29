// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import { remarkUpdateTime } from "./plugins/documentMetadataRemarker/remark-git-dates.mjs";
import { remarkDocumentMetadata } from "./plugins/documentMetadataRemarker/remark-title-and-desc.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://blind-guess-senior.github.io/",
  integrations: [mdx(), sitemap()],
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Atkinson",
      cssVariable: "--font-atkinson",
      fallbacks: ["sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/atkinson-regular.woff"],
            weight: 400,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/atkinson-bold.woff"],
            weight: 700,
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Monaspace Xenon",
      cssVariable: "--font-monaspace",
      fallbacks: ["monospace"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/MonaspaceXenon-ExtraLight.otf"],
            weight: 200,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/MonaspaceXenon-Bold.otf"],
            weight: 700,
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkUpdateTime, remarkDocumentMetadata],
    }),
  },
});
