// @ts-check

import mdx from "@astrojs/mdx";
import { satteri } from "@astrojs/markdown-satteri";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import { codeLanguagePlugin } from "./plugins/codeBlocksRemarker/satteri-code-language";
import { indentedBlocksPlugin } from "./plugins/indentedBlocksRemarker/satteri-indented-blocks";
import { obsidianWikilinksPlugin } from "./plugins/obsidianWililinkRamarker/satteri-obsidian-wikilinks";
import { gitDatesPlugin } from "./plugins/documentMetadataRemarker/satteri-git-dates";
import { documentMetadataPlugin } from "./plugins/documentMetadataRemarker/satteri-title-and-desc";

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
    processor: satteri({
      mdastPlugins: [
        // 先把缩进块还原成正文，后面的插件才看得到里面的行内 markdown
        indentedBlocksPlugin,
        obsidianWikilinksPlugin,
        gitDatesPlugin,
        documentMetadataPlugin,
      ],
      hastPlugins: [codeLanguagePlugin()],
    }),
  },
});
