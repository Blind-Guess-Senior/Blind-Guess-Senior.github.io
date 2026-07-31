import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { slug } from "github-slugger";
import { createPostLoader } from "./lib/post-loader-creator";
import { createSeriesLoader } from "./lib/series-loader-creator";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/posts/blog` directory.
  loader: createPostLoader("./src/content/posts/blog", "blog"),
  // Type-check frontmatter using a schema
  schema: ({}) =>
    z.object({
      tags: z.preprocess(
        (tags) => (tags === null ? undefined : tags),
        z.array(z.string()).default([]),
      ),
      "series-id": z
        .string()
        .transform((value) => slug(value))
        .optional(),
      "series-order": z.number().optional(),
    }),
});

const prose = defineCollection({
  loader: createPostLoader("./src/content/posts/prose", "prose"),
  // Type-check frontmatter using a schema
  schema: ({}) =>
    z.object({
      tags: z.preprocess(
        (tags) => (tags === null ? undefined : tags),
        z.array(z.string()).default([]),
      ),
      "series-id": z
        .string()
        .transform((value) => slug(value))
        .optional(),
      "series-order": z.number().optional(),
    }),
});

const seriesBaseSchema = z.object({
  "series-id": z.string().transform((value) => slug(value)),
  tags: z.preprocess(
    (tags) => (tags === null ? undefined : tags),
    z.array(z.string()).default([]),
  ),
});

const optionalSeriesTitleSchema = z.preprocess(
  (title) => (title === null ? undefined : title),
  z.string().min(1).optional(),
);

const requiredSeriesTitleSchema = z.preprocess(
  (title) => (title === null ? undefined : title),
  z.string().min(1),
);

const series = defineCollection({
  loader: createSeriesLoader("./src/content"),
  schema: ({}) =>
    z.discriminatedUnion("series-listing", [
      seriesBaseSchema.extend({
        "series-listing": z.literal("posts"),
        "series-title": optionalSeriesTitleSchema,
      }),

      seriesBaseSchema.extend({
        "series-listing": z.literal("series"),
        "series-title": requiredSeriesTitleSchema,
      }),
    ]),
});

export const collections = { blog, prose, series };
