import type { CollectionEntry } from "astro:content";
import { z } from "astro/zod";

export type ArticleProps = {
  title: string;
  description: string;
  publishedAt: Date;
  updatedAt: Date;
  heroImage?: ImageMetadata | undefined;
  tags: string[];
};

// Only pick heroImage and tags data.
type ValidatedArticlePredefinedData = Pick<
  CollectionEntry<"blog">["data"],
  "heroImage" | "tags"
>;

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
): ArticleProps {
  const articleGeneratedDataParseResult =
    ArticleGeneratedDataSchema.safeParse(raw);

  if (!articleGeneratedDataParseResult.success) {
    // 格式化错误信息（例如：title: Required, publishedAt: Invalid date）
    const errorDetail = articleGeneratedDataParseResult.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new Error(`[blog] "${id}" Invalid metadata: ${errorDetail}`);
  }

  const { title, description, publishedAt, updatedAt } =
    articleGeneratedDataParseResult.data;

  return {
    title,
    description,
    publishedAt,
    updatedAt,
    heroImage: predefinedData.heroImage,
    tags: predefinedData.tags,
  };
}
