import type { Link, Root } from "mdast";
import { slug } from "github-slugger";
import {
  findAndReplace,
  type FindAndReplaceTuple,
} from "mdast-util-find-and-replace";
import {
  createArticleIndex,
  resolveFileLinkTarget,
  type ArticleIndex,
} from "./article-index";

const WIKILINK_PATTERN = /(?<!!)\[\[([^\]\r\n]+)\]\]/g;

type WikilinkParts = {
  target?: string;
  heading?: string;
  displayLabel?: string;
};

type RemarkObsidianWikilinkOptions = {
  vaultRootPath: string;
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

function resolveHref(
  parts: WikilinkParts,
  index: ArticleIndex,
): string | undefined {
  const fragment = parts.heading ? `#${slug(parts.heading)}` : "";
  if (parts.target === undefined) {
    return fragment;
  }

  const article = resolveFileLinkTarget(parts.target, index);
  if (article === undefined) {
    return undefined;
  }

  return `${article.href}${fragment}`;
}

export function remarkObsidianWikilinks(
  options: RemarkObsidianWikilinkOptions,
) {
  const index = createArticleIndex(options.vaultRootPath);

  return function transformer(tree: Root) {
    const replacement: FindAndReplaceTuple = [
      WIKILINK_PATTERN,
      (_match: string, value: string) => {
        const parts = parseWikiLink(value);

        const url = resolveHref(parts, index);
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

    findAndReplace(tree, replacement, {
      ignore: ["link", "linkReference"],
    });
  };
}
