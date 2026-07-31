import { glob } from "astro/loaders";
import { slug } from "github-slugger";

export function createSeriesLoader(basePath: string) {
  const generatedIds = new Map<string, string>(); // seriesId -> series definition file path

  return glob({
    base: basePath,
    pattern: "**/series.yaml",

    generateId({ entry, data }): string {
      const seriesIDRaw = data["series-id"];

      if (typeof seriesIDRaw !== "string") {
        throw new Error(
          `[series] "${entry}" must define "series-id" as a string`,
        );
      }

      const seriesID = slug(seriesIDRaw);

      const existingEntry = generatedIds.get(seriesID);
      if (existingEntry !== undefined && existingEntry !== entry) {
        throw new Error(
          `[series] Series ID collision: "${existingEntry}" and "${entry}" both define "${seriesID}"`,
        );
      }

      generatedIds.set(seriesID, entry);

      return seriesID;
    },
  });
}
