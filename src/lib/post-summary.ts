import { getCollection, render } from "astro:content";
import { type ArticleProps } from "./article-props";
import { toArticleProps } from "./article-props";
import { type PostType } from "./post-loader-creator";

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
        href: `/${postType}/${entry.id}/`,
      };
    }),
  );

  return sortByUpdatedAt(posts);
}

export async function getAllPostSummaries(): Promise<PostSummary[]> {
  const [blogPosts, prosePosts] = await Promise.all([
    getPostSummaries("blog"),
    getPostSummaries("prose"),
  ]);

  return sortByUpdatedAt([...blogPosts, ...prosePosts]);
}
