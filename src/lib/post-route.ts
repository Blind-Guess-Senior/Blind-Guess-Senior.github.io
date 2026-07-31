import { slug } from "github-slugger";

export const POST_TYPES = ["blog", "prose"] as const;

export const GLOBED_TYPES = [...POST_TYPES, "series"] as const;

export type PostType = (typeof POST_TYPES)[number];

export function isPostType(value: string): value is PostType {
  return (POST_TYPES as readonly string[]).includes(value);
}

export function createPostId(filePath: string): string {
  return normalizeArticlePath(filePath)
    .split("/")
    .map((segment) => slug(segment))
    .join("/");
}

export function createNormalPostSlug(postId: string): string {
  return postId.slice(postId.lastIndexOf("/") + 1);
}

export function createSeriesPostSlug(
  seriesID: string,
  seriesOrder: number,
): string {
  return `${seriesID}/chapter-${seriesOrder}`;
}

export function createPostHref(postType: PostType, routeSlug: string): string {
  return `/${postType}/${routeSlug}`;
}

function toPosixPath(value: string): string {
  return value.replaceAll("\\", "/");
}

export function normalizeArticlePath(value: string): string {
  return toPosixPath(value.trim()).replace(/\.(md|mdx)$/i, "");
}
