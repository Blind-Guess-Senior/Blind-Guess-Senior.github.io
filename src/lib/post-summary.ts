import { getCollection, render } from "astro:content";
import { type ArticleProps } from "./article-props";
import { toArticleProps } from "./article-props";
import { createPostHref, POST_TYPES, type PostType } from "./post-route";

export type PostSummary = ArticleProps & {
  id: string;
  type: PostType;
  href: string;
};

function sortByUpdatedAt(posts: PostSummary[]) {
  return posts.sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf());
}

export async function getPostSummaries(
  postType: PostType,
): Promise<PostSummary[]> {
  const entries = await getCollection(postType);

  const posts = await Promise.all(
    entries.map(async (entry) => {
      const { remarkPluginFrontmatter } = await render(entry);
      return {
        ...toArticleProps(remarkPluginFrontmatter, entry.data, entry.id),
        id: entry.id,
        type: postType,
        href: createPostHref(postType, entry.id),
      };
    }),
  );

  return sortByUpdatedAt(posts);
}

export async function getAllPostSummaries(): Promise<PostSummary[]> {
  const allPosts = await Promise.all(
    POST_TYPES.map((type) => getPostSummaries(type)),
  );

  return sortByUpdatedAt(allPosts.flat());
}
