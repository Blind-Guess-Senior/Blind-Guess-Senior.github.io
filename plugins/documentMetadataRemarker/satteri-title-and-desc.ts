import { basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { MdastPluginDefinition, PluginFactoryContext } from "satteri";

const DESCRIPTION_MAX_LENGTH = 160;

function truncate(text: string, maxLength: number): string {
  const characters = Array.from(text);

  if (characters.length <= maxLength) {
    return text;
  }

  return `${characters.slice(0, maxLength).join("")}…`;
}

/**
 * 标题取文件名，描述取第一个非空段落（就是页面 meta description 那两句）。
 *
 * satteri 的 `before` 钩子拿得到整棵树，所以直接找第一个 paragraph，
 * 文本用 `ctx.textContent` 收（等价于原来的 mdast-util-to-string）。
 */
export function documentMetadataPlugin(
  factory: PluginFactoryContext,
): MdastPluginDefinition {
  const fileName = factory.fileURL ? fileURLToPath(factory.fileURL) : "";
  const title = fileName ? basename(fileName, extname(fileName)) : "";

  return {
    name: "document-metadata",
    before(root, ctx) {
      const paragraph = root.children.find((node) => node.type === "paragraph");

      const description = paragraph
        ? truncate(
            ctx.textContent(paragraph).replace(/\s+/g, " ").trim(),
            DESCRIPTION_MAX_LENGTH,
          )
        : "";

      const frontmatter = ctx.data.astro?.frontmatter;
      if (!frontmatter) {
        return;
      }

      frontmatter.title = title;
      frontmatter.description = description;
    },
  };
}
