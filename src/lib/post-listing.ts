import { render } from "astro:content";
import { toArticleProps, type ArticleProps } from "./article-props";
import { createPostHref, POST_TYPES, type PostType } from "./post-route";
import {
  getPostCatalog,
  type PostCatalog,
  type PostCatalogEntry,
  type SeriesCatalogGroup,
} from "./series-catalog";

// Listing type represent an entry that should be displayed in index page.

// Base type of an listing entry
type ListingBase = ArticleProps & {
  id: string;
  postType: PostType;
  href: string;
};

export type ArticleListing = ListingBase & {
  kind: "article";
};

export type SeriesListing = ListingBase & {
  kind: "series";
  chapterCount: number;
};

export type PostListing = ArticleListing | SeriesListing;

function sortByUpdatedAt(posts: PostListing[]) {
  return posts.sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf());
}

export async function toArticleListing(
  catalogEntry: PostCatalogEntry,
): Promise<ArticleListing> {
  const { entry, postType, href } = catalogEntry;
  const { remarkPluginFrontmatter } = await render(entry);

  return {
    ...toArticleProps(
      remarkPluginFrontmatter,
      entry.data,
      entry.id,
      entry.filePath,
    ),

    kind: "article", // This entry still be treated as an article, even though it may be a series-listing type post which belongs to a series. They will be flitered after.

    id: entry.id,
    postType: postType,
    href,
  };
}

export function toSeriesListing(
  group: SeriesCatalogGroup,
  chapters: ArticleListing[],
): SeriesListing {
  const firstChapter = chapters[0]!;

  const publishedAt = new Date(
    Math.min(...chapters.map((chapter) => chapter.publishedAt.valueOf())),
  );
  const updatedAt = new Date(
    Math.max(...chapters.map((chapter) => chapter.updatedAt.valueOf())),
  );

  return {
    kind: "series", // Listing entry that represent catalog/menu of a series-listing type series.

    id: group.definition.id,
    postType: group.postType,
    href: createPostHref(group.postType, group.definition.id),

    title: group.definition.data["series-title"] ?? group.definition.id,
    description: firstChapter.description,
    publishedAt: publishedAt,
    updatedAt: updatedAt,
    coverImage: undefined,
    tags: group.definition.data.tags,

    chapterCount: chapters.length,
  };
}

// Get all post listing entries of given postType.
export async function getPostListings(
  postType: PostType,
): Promise<PostListing[]> {
  const catalog: PostCatalog = await getPostCatalog();

  const entries: PostCatalogEntry<typeof postType>[] = catalog.entries.filter(
    (entry) => entry.postType === postType,
  );

  const articleListings: ArticleListing[] = await Promise.all(
    entries.map(toArticleListing),
  );

  const listingByEntry = new Map(
    entries.map((entry, index) => [entry, articleListings[index]!]),
  );

  // posts that should be displayed as normal post
  const visibleArticles = entries
    .filter((entry) => entry.series?.data["series-listing"] !== "series")
    .map((entry) => listingByEntry.get(entry)!);

  // series-listing seires' catalog/menu entry
  const visibleSeries = catalog.series
    .filter(
      (group) =>
        group.postType === postType &&
        group.definition.data["series-listing"] === "series",
    )
    .map((group) => {
      const chapters = group.members.map(
        (member) => listingByEntry.get(member)!,
      );
      return toSeriesListing(group, chapters);
    });

  return sortByUpdatedAt([...visibleArticles, ...visibleSeries]);
}

export async function getAllPostListings(): Promise<PostListing[]> {
  const allListings = await Promise.all(
    POST_TYPES.map((type) => getPostListings(type)),
  );

  return sortByUpdatedAt(allListings.flat());
}
