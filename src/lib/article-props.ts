import type { CollectionEntry } from "astro:content";
import { z } from "astro/zod";
import type { PostType, POST_TYPES } from "./post-route";
import { getCoverImage } from "./cover-image-loader";

export type ArticleProps = {
  title: string;
  description: string;
  publishedAt: Date;
  updatedAt: Date;
  coverImage?: ImageMetadata | undefined;
  tags: string[];
};

export type TypedPostEntry<T extends PostType = PostType> = {
  postType: T;
  entry: CollectionEntry<T>;
};

export type RelatedPost<T extends PostType = PostType> = TypedPostEntry<T> & {
  href: string;
};

export type ArticleNavigationProps = {
  previous: RelatedPost | undefined;
  next: RelatedPost | undefined;
};

export type ArticleWithNavigationProps = ArticleProps & ArticleNavigationProps;

type PostEntries = CollectionEntry<(typeof POST_TYPES)[number]>;

// Only pick tags data.
type ValidatedArticlePredefinedData = Pick<PostEntries["data"], "tags">;

const ArticleGeneratedDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export function toArticleProps(
  raw: Record<string, unknown>,
  predefinedData: ValidatedArticlePredefinedData,
  id: string,
  filePath: string | undefined,
): ArticleProps {
  const articleGeneratedDataParseResult =
    ArticleGeneratedDataSchema.safeParse(raw);

  if (!articleGeneratedDataParseResult.success) {
    // 格式化错误信息（例如：title: Required, publishedAt: Invalid date）
    const errorDetail = articleGeneratedDataParseResult.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new Error(`[posts] "${id}" Invalid metadata: ${errorDetail}`);
  }

  const { title, description, publishedAt, updatedAt } =
    articleGeneratedDataParseResult.data;

  return {
    title,
    description,
    publishedAt,
    updatedAt,
    coverImage: filePath !== undefined ? getCoverImage(filePath) : undefined,
    tags: predefinedData.tags,
  };
}
