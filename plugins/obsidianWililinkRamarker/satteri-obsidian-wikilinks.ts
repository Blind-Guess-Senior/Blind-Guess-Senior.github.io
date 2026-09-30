import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { slug } from "github-slugger";
import type {
  MdastContent,
  MdastPluginDefinition,
  PluginFactoryContext,
} from "satteri";
import {
  createNormalPostSlug,
  createPostId,
  normalizeArticlePath,
} from "../../src/lib/post-route";

/** 一次匹配 `[[...]]` 与 `![[...]]`，`!` 前缀决定它是图片还是链接。 */
const WIKILINK_PATTERN = /!?\[\[([^\]\r\n]+)\]\]/g;
const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);
const VAULT_ROOT = fileURLToPath(new URL("../../src/content/", import.meta.url));

type WikilinkParts = {
  target?: string;
  heading?: string;
  displayLabel?: string;
};

export function parseWikiLink(wikilink: string): WikilinkParts {
  const result: WikilinkParts = {};

  const displayLabelSeparator = wikilink.indexOf("|");

  const destination =
    displayLabelSeparator === -1
      ? wikilink
      : wikilink.slice(0, displayLabelSeparator);

  const displayLabel =
    displayLabelSeparator === -1
      ? undefined
      : wikilink.slice(displayLabelSeparator + 1);

  const headingSeparator = destination.indexOf("#");

  if (headingSeparator === -1) {
    result.target = destination;
  } else {
    if (headingSeparator !== 0) {
      result.target = destination.slice(0, headingSeparator);
    }
    result.heading = destination.slice(headingSeparator + 1);
  }

  if (displayLabel !== undefined) {
    result.displayLabel = displayLabel;
  }

  return result;
}

function resolveHref(parts: WikilinkParts): string | undefined {
  const fragment = parts.heading ? `#${slug(parts.heading)}` : "";
  if (parts.target === undefined) {
    return fragment;
  }
  const target = normalizeArticlePath(parts.target);
  const routeRoot = target.split("/")[1];

  const routeSlug = createNormalPostSlug(createPostId(target));

  return `/${routeRoot}/${routeSlug}${fragment}`;
}

function resolveImageUrl(target: string, filePath: string): string {
  const imagePath = resolve(VAULT_ROOT, target);
  const relativePath = relative(dirname(filePath), imagePath).replaceAll(
    "\\",
    "/",
  );

  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function createImage(target: string, filePath: string): MdastContent | undefined {
  if (!IMAGE_EXTENSIONS.has(extname(target).toLowerCase())) {
    return undefined;
  }

  return { type: "image", url: resolveImageUrl(target, filePath), alt: "" };
}

function createLink(value: string): MdastContent | undefined {
  const parts = parseWikiLink(value);

  const url = resolveHref(parts);
  if (url === undefined) {
    return undefined;
  }

  return {
    type: "link",
    url: url,
    children: [
      {
        type: "text",
        value: parts.displayLabel ?? value,
      },
    ],
  };
}

/**
 * Obsidian 的 `[[文章]]` / `![[图片]]` 语法。
 *
 * 换成 satteri 的 text 访问器后，只处理文本节点本身：一次正则扫描把命中的片段
 * 换成 link / image 节点，剩下的原样拼接回去。认不出来的（例如 `![[x.txt]]`）
 * 保持字面量，和以前的 find-and-replace 版本一致。
 */
export function obsidianWikilinksPlugin(
  factory: PluginFactoryContext,
): MdastPluginDefinition {
  const filePath = factory.fileURL ? fileURLToPath(factory.fileURL) : "";

  return {
    name: "obsidian-wikilinks",
    text(node, ctx) {
      const value = node.value;
      if (!value.includes("[[")) {
        return;
      }

      const parts: MdastContent[] = [];
      let last = 0;
      let changed = false;

      WIKILINK_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = WIKILINK_PATTERN.exec(value)) !== null) {
        const inner = match[1] ?? "";
        const replacement = match[0].startsWith("!")
          ? createImage(inner, filePath)
          : createLink(inner);

        if (replacement === undefined) {
          continue;
        }

        if (match.index > last) {
          parts.push({ type: "text", value: value.slice(last, match.index) });
        }
        parts.push(replacement);
        changed = true;
        last = match.index + match[0].length;
      }

      if (!changed) {
        return;
      }
      if (last < value.length) {
        parts.push({ type: "text", value: value.slice(last) });
      }

      ctx.replaceNode(node, parts);
    },
  };
}
