import type { ImageMetadata } from "astro";
import { normalizeArticlePath } from "./post-route";

const COVER_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg"] as const;

// Vite style path. / -> project root
const coverImages = import.meta.glob<ImageMetadata>(
  "/src/content/images/**/cover.*",
  {
    eager: true,
    import: "default",
  },
);

export function getCoverImage(postFilePath: string): ImageMetadata | undefined {
  const normalizedPath = normalizeArticlePath(postFilePath);
  const imagePath = normalizedPath.replace(
    "src/content/posts/",
    "/src/content/images/",
  );

  for (const ext of COVER_IMAGE_EXTENSIONS) {
    const image = coverImages[`${imagePath}/cover.${ext}`];
    if (image) return image;
  }
  return undefined;
}
