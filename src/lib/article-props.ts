import type { CollectionEntry } from "astro:content";
import { z } from "astro/zod";
import type { PostType, POST_TYPES } from "./post-route";
import { getCoverImage } from "./cover-image-loader";

export type ArticleProps = {
  title: string;
  description: string;
  publishedAt: Date;
  updatedAt: Date;
  /** 精确到分钟的更新时间，只当排序键用（见 post-listing.ts），不展示。 */
  updatedAtPrecise?: Date | undefined;
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
  updatedAtPrecise: z.coerce.date().optional(),
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

  const { title, description, publishedAt, updatedAt, updatedAtPrecise } =
    articleGeneratedDataParseResult.data;

  return {
    title,
    description,
    publishedAt,
    updatedAt,
    updatedAtPrecise,
    coverImage: filePath !== undefined ? getCoverImage(filePath) : undefined,
    tags: predefinedData.tags,
  };
}
