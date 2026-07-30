import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { createPostLoader } from "./lib/post-loader-creator";
// import "astro/loaders";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/posts/blog` directory.
  loader: createPostLoader("./src/content/posts/blog", "blog"),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      heroImage: z.preprocess(
        (path) => (path === "" || path === null ? undefined : path),
        z.optional(image()),
      ),
      tags: z.array(z.string()).default([]),
    }),
});

const prose = defineCollection({
  loader: createPostLoader("./src/content/posts/prose", "prose"),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      heroImage: z.preprocess(
        (path) => (path === "" || path === null ? undefined : path),
        z.optional(image()),
      ),
      tags: z.array(z.string()).default([]),
    }),
});

export const collections = { blog, prose };
