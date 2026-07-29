import { execFileSync } from "node:child_process";
import { relative } from "node:path";

export function remarkUpdateTime() {
  return function (tree, file) {
    const filePath = relative(process.cwd(), file.history[0]).replaceAll(
      "\\",
      "/",
    );
    const commits = execFileSync(
      "git",
      ["log", "--follow", "--pretty=format:%cs", "--", filePath],
      { encoding: "utf8" },
    )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);

    file.data.astro ??= {};
    file.data.astro.frontmatter ??= {};
    const frontmatter = file.data.astro.frontmatter;

    const now = new Date();
    frontmatter.publishedAt ??= commits.length ? new Date(commits.at(-1)) : now;
    frontmatter.updatedAt = commits.length ? new Date(commits[0]) : now;
  };
}
