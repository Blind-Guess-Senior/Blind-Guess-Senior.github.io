import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Image, Link, Root } from "mdast";
import { slug } from "github-slugger";
import {
  findAndReplace,
  type FindAndReplaceTuple,
} from "mdast-util-find-and-replace";
import type { VFile } from "vfile";
import {
  createNormalPostSlug,
  createPostId,
  normalizeArticlePath,
} from "../../src/lib/post-route";

const WIKILINK_PATTERN = /(?<!!)\[\[([^\]\r\n]+)\]\]/g;
const WIKIIMAGE_PATTERN = /!\[\[([^\]\r\n]+)\]\]/g;
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

export function remarkObsidianWikilinks() {
  return function transformer(tree: Root, file: VFile) {
    const imageReplacement: FindAndReplaceTuple = [
      WIKIIMAGE_PATTERN,
      (_match: string, target: string) => {
        if (!IMAGE_EXTENSIONS.has(extname(target).toLowerCase())) {
          return false;
        }

        return {
          type: "image",
          url: resolveImageUrl(target, file.path),
          alt: "",
        } satisfies Image;
      },
    ];

    const replacement: FindAndReplaceTuple = [
      WIKILINK_PATTERN,
      (_match: string, value: string) => {
        const parts = parseWikiLink(value);

        const url = resolveHref(parts);
        if (url === undefined) {
          return false;
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
        } satisfies Link;
      },
    ];

    findAndReplace(tree, imageReplacement);
    findAndReplace(tree, replacement, {
      ignore: ["link", "linkReference"],
    });
  };
}
