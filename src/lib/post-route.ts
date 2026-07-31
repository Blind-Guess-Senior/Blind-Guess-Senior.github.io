import { basename, extname } from "node:path";
import { slug } from "github-slugger";

export const POST_TYPES = ["blog", "prose"] as const;

export type PostType = (typeof POST_TYPES)[number];

export function isPostType(value: string): value is PostType {
  return (POST_TYPES as readonly string[]).includes(value);
}

export function createPostId(filePath: string): string {
  const filename = basename(filePath, extname(filePath));
  return slug(filename);
}

export function createPostHref(postType: PostType, id: string): string {
  return `/${postType}/${id}/`;
}
