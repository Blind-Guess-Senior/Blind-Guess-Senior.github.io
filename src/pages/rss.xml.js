import rss from "@astrojs/rss";
import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";
import { getAllPostSummaries } from "../lib/post-summary";

export async function GET(context) {
  const posts = await getAllPostSummaries();
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: post.publishedAt,
      updDate: post.updatedAt,
      link: post.href,
    })),
  });
}
