import type { APIRoute } from "astro";
import rss, { type RSSFeedItem } from "@astrojs/rss";
import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";
import { getAllPostListings } from "../lib/post-listing";

export const GET: APIRoute = async ({ site }) => {
  if (site === undefined) {
    throw new Error("[rss] Astro site is not configured");
  }

  const posts = await getAllPostListings();

  const items = posts.map(
    (post) =>
      ({
        title: post.title,
        description: post.description,
        pubDate: post.updatedAt, // RSS do not support official updated date. So pass updatedAt to make sure updates won't be ignored
        link: post.href,
        categories: [post.postType],
      }) satisfies RSSFeedItem,
  );

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: site,
    items: items,
  });
};
