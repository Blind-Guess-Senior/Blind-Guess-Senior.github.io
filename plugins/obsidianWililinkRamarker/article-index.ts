import { readdirSync } from "node:fs";
import { basename, extname, relative, resolve } from "node:path";
import {
  createPostHref,
  createPostId,
  POST_TYPES,
  type PostType,
} from "../../src/lib/post-route";

const ARTICLE_EXTENSIONS = new Set([".md", ".mdx"]);

export type ArticleEntry = {
  name: string;
  vaultPath: string;
  id: string;
  postType: PostType;
  href: string;
};

// vaultPath -> entry stored
export type ArticleIndex = {
  byPath: Map<string, ArticleEntry>;
  byName: Map<string, ArticleEntry[]>;
};

function toPosixPath(value: string): string {
  return value.replaceAll("\\", "/");
}

function normalizeArticlePath(value: string): string {
  return toPosixPath(value.trim()).replace(/\.(md|mdx)$/i, "");
}

function collectArticleFiles(
  directory: string,
  files: string[] = [],
): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      collectArticleFiles(absolutePath, files);
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    if (ARTICLE_EXTENSIONS.has(extension)) {
      files.push(absolutePath);
    }
  }
  return files;
}

export function createArticleIndex(vaultRootPath: string) {
  const vaultRoot = resolve(vaultRootPath);

  const byPath = new Map<string, ArticleEntry>();
  const byName = new Map<string, ArticleEntry[]>();

  for (const postType of POST_TYPES) {
    const collectionRoot = resolve(vaultRoot, "posts", postType);

    for (const absolutePath of collectArticleFiles(collectionRoot)) {
      const entry = relative(collectionRoot, absolutePath);
      const vaultPath = normalizeArticlePath(relative(vaultRoot, absolutePath));

      const name = basename(vaultPath);
      const id = createPostId(entry);

      const article: ArticleEntry = {
        name,
        vaultPath: vaultPath,
        postType: postType,
        id,
        href: createPostHref(postType, id),
      };

      byPath.set(vaultPath, article);

      const sameNameArticles = byName.get(name) ?? [];
      sameNameArticles.push(article);
      byName.set(name, sameNameArticles);
    }
  }

  return { byPath, byName };
}

export function resolveFileLinkTarget(
  target: string,
  index: ArticleIndex,
): ArticleEntry | undefined {
  const normalizeTarget = normalizeArticlePath(target);

  const pathMatch = index.byPath.get(normalizeTarget);
  if (pathMatch) {
    return pathMatch;
  }

  const name = basename(normalizeTarget);
  const nameMatches = index.byName.get(name) ?? [];

  if (nameMatches.length === 1) {
    return nameMatches[0];
  }

  return undefined;
}
