import { glob } from "astro/loaders";
import { slug } from "github-slugger";
import { basename, extname } from "node:path";

export type PostType = "blog" | "prose";

export function createPostLoader(basePath: string, postType: PostType) {
  const generatedIds = new Map<string, string>(); // slug -> filePath

  return glob({
    base: basePath,
    pattern: "**/*.{md,mdx}",

    generateId({ entry }): string {
      const filename = basename(entry, extname(entry));
      const id = slug(filename);

      const existingEntry = generatedIds.get(id);
      if (existingEntry !== undefined && existingEntry !== entry) {
        throw new Error(
          `[${postType}] Slug collision: "${existingEntry}" and "${entry}" both generate "${id}"`,
        );
      }
      generatedIds.set(id, entry);

      return id;
    },
  });
}
