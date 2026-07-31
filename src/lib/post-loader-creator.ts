import { glob } from "astro/loaders";
import { createPostId, type PostType } from "./post-route";

export function createPostLoader(basePath: string, postType: PostType) {
  const generatedIds = new Map<string, string>(); // slug -> filePath

  return glob({
    base: basePath,
    pattern: "**/*.{md,mdx}",

    generateId({ entry }): string {
      const id = createPostId(entry);

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
