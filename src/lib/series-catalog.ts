import { getCollection, type CollectionEntry } from "astro:content";
import {
  createNormalPostSlug,
  createSeriesPostSlug,
  createPostHref,
  GLOBED_TYPES,
  POST_TYPES,
  type PostType,
} from "./post-route";
import type { TypedPostEntry, RelatedPost } from "./article-props";

export type SeriesEntry = CollectionEntry<"series">;

export type SeriesCatalogGroup = {
  definition: SeriesEntry; // def of series itself, which declared in series.yaml
  postType: PostType;
  members: PostCatalogEntry[]; // all catalog entries belong to that series
};

// Entry (before render) that refs to an post but stored in type with series info
export type PostCatalogEntry<T extends PostType = PostType> =
  TypedPostEntry<T> & {
    series: SeriesEntry | undefined; // series that this post belongs to
    routeSlug: string; // route used slug of post
    href: string; // href of post
    previous: RelatedPost | undefined;
    next: RelatedPost | undefined;
  };

export type PostCatalog = {
  entries: PostCatalogEntry[]; // plain-stored all post entries
  series: SeriesCatalogGroup[]; // post entries that represented in series form
};

// Map entries to its series and return a sructured catalog.
export async function getPostCatalog(): Promise<PostCatalog> {
  const collections = Object.fromEntries(
    await Promise.all(
      GLOBED_TYPES.map(
        async (type) => [type, await getCollection(type)] as const,
      ),
    ),
  ) as {
    [T_K in (typeof GLOBED_TYPES)[number]]: Awaited<
      ReturnType<typeof getCollection<T_K>>
    >;
  };

  const seriesByID = new Map(
    collections.series.map((series) => [series.id, series] as const),
  );

  const generatedHrefs = new Map<string, TypedPostEntry>();

  // get all entries with postType and series reference.
  const entries = POST_TYPES.flatMap((postType) =>
    collections[postType].map((entry): PostCatalogEntry => {
      const seriesID = entry.data["series-id"];

      let series: SeriesEntry | undefined;

      if (seriesID !== undefined) {
        series = seriesByID.get(seriesID);

        if (series === undefined) {
          throw new Error(
            `[${postType}] "${entry.id}" references unknown series "${seriesID}"`,
          );
        }
      }

      let routeSlug = createNormalPostSlug(entry.id);

      if (series?.data["series-listing"]) {
        const seriesOrder = entry.data["series-order"];

        if (seriesOrder === undefined) {
          throw new Error(
            `[${postType}] "${entry.id}" belongs to series "${series.id}" but has no series-order`,
          );
        }

        if (series?.data["series-listing"] === "series") {
          routeSlug = createSeriesPostSlug(series.id, seriesOrder);
        }
      }

      const href = createPostHref(postType, routeSlug);

      const existingEntry = generatedHrefs.get(href);
      if (existingEntry !== undefined) {
        throw new Error(
          `[posts] Href collision: [${existingEntry.postType}] "${existingEntry.entry.id}" and [${postType}] "${entry.id}" both generate "${href}"`,
        );
      }
      generatedHrefs.set(href, { postType, entry });

      return {
        postType: postType,
        entry: entry,
        series: series,
        routeSlug: routeSlug,
        href: href,
        previous: undefined,
        next: undefined,
      };
    }),
  );

  // set previous and next references
  // stores all series.
  const entriesBySeriesID = new Map<
    string,
    Array<{ order: number; catalogEntry: PostCatalogEntry }>
  >();

  // store all post to series maps.
  for (const catalogEntry of entries) {
    if (catalogEntry.series === undefined) {
      continue;
    }

    const seriesOrder = catalogEntry.entry.data["series-order"]!;

    const orderedEntries = entriesBySeriesID.get(catalogEntry.series.id) ?? [];

    const existingEntry = orderedEntries.find(
      ({ order }) => order === seriesOrder,
    );
    if (existingEntry !== undefined) {
      throw new Error(
        `[series] Order collision in "${catalogEntry.series.id}": [${existingEntry.catalogEntry.postType}] "${existingEntry.catalogEntry.entry.id}" and [${catalogEntry.postType}] "${catalogEntry.entry.id}" both define order "${seriesOrder}"`,
      );
    }

    orderedEntries.push({
      order: seriesOrder,
      catalogEntry,
    });

    entriesBySeriesID.set(catalogEntry.series.id, orderedEntries);
  }

  // actually set previous and next references.
  for (const orderedEntries of entriesBySeriesID.values()) {
    orderedEntries.sort((a, b) => a.order - b.order);

    orderedEntries.forEach(({ catalogEntry }, index) => {
      const previousEntry = orderedEntries[index - 1]?.catalogEntry;
      const nextEntry = orderedEntries[index + 1]?.catalogEntry;

      if (previousEntry !== undefined) {
        catalogEntry.previous = {
          postType: previousEntry.postType,
          entry: previousEntry.entry,
          href: previousEntry.href,
        };
      }

      if (nextEntry !== undefined) {
        catalogEntry.next = {
          postType: nextEntry.postType,
          entry: nextEntry.entry,
          href: nextEntry.href,
        };
      }
    });
  }

  const seriesGroups: SeriesCatalogGroup[] = Array.from(
    entriesBySeriesID.entries(),
  ).map(([seriesID, orderedEntries]) => {
    const definition = seriesByID.get(seriesID)!;
    const postType = orderedEntries[0]!.catalogEntry.postType;

    // Not support series through different post types.
    const mixedPostTypeEntry = orderedEntries.find(
      ({ catalogEntry }) => catalogEntry.postType !== postType,
    );

    if (mixedPostTypeEntry !== undefined) {
      throw new Error(
        `[series] "${seriesID}" contains entries from multiple post types`,
      );
    }

    return {
      definition: definition,
      postType: postType,
      members: orderedEntries.map(({ catalogEntry }) => catalogEntry),
    };
  });

  return {
    entries,
    series: seriesGroups,
  };
}

export async function getPostCatalogEntries<T extends PostType>(
  postType: T,
): Promise<PostCatalogEntry<T>[]> {
  const catalog = await getPostCatalog();
  return catalog.entries.filter(
    (entry): entry is PostCatalogEntry<T> => entry.postType === postType,
  );
}
