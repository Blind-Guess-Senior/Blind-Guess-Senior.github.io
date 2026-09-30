import { execFileSync } from "node:child_process";
import { relative } from "node:path";

/**
 * 工程提交：带这些前缀的提交只是顺带碰了内容文件（改样式、调构建、搬目录……），
 * 不算内容更新。写法参照 ../Oneday 的 src/lib/config.ts。
 */
const ENGINEERING_COMMIT =
  /^(feat|fix|refactor|chore|config|docs|test|build|style|perf|ci)(\([^)]*\))?!?:/;

export function remarkUpdateTime() {
  return function (tree, file) {
    const filePath = relative(process.cwd(), file.history[0]).replaceAll(
      "\\",
      "/",
    );
    // git log 是新到旧；%x09 用来把日期和 subject 分开。
    const commits = execFileSync(
      "git",
      ["log", "--follow", "--pretty=format:%cs%x09%s", "--", filePath],
      { encoding: "utf8" },
    )
      .split(/\r?\n/)
      .map((line) => line.split("\t"))
      .filter(([date, subject]) => date && subject);

    // 只认内容提交：更新的取最新一条，发布的取最早一条。
    const contentCommits = commits.filter(
      ([, subject]) => !ENGINEERING_COMMIT.test(subject),
    );
    // 历史里一条内容提交都没有的文件（例如只由 init / feat 引入）没有内容日期
    // 可用，退回全量历史：日期至少是稳定的，不会随构建时间漂移。
    const dated = contentCommits.length ? contentCommits : commits;

    file.data.astro ??= {};
    file.data.astro.frontmatter ??= {};
    const frontmatter = file.data.astro.frontmatter;

    const now = new Date();
    frontmatter.publishedAt ??= dated.length ? new Date(dated.at(-1)[0]) : now;
    frontmatter.updatedAt = dated.length ? new Date(dated[0][0]) : now;
  };
}
