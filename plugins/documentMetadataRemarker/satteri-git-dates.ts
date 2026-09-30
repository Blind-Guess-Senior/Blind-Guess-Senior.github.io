import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { MdastPluginDefinition, PluginFactoryContext } from "satteri";

/**
 * 工程提交：带这些前缀的提交只是顺带碰了内容文件（改样式、调构建、搬目录……），
 * 不算内容更新。写法参照 ../Oneday 的 src/lib/config.ts。
 */
const ENGINEERING_COMMIT =
  /^(feat|fix|refactor|chore|config|docs|test|build|style|perf|ci)(\([^)]*\))?!?:/;

/**
 * 用 git 历史算 publishedAt / updatedAt，写进 frontmatter。
 *
 * satteri 的 `before` 钩子一次文档跑一次，不碰树，正好放这段纯 IO。
 * `ctx.data.astro` 是 Astro 建好的数据袋（和 remark 管线同一条通道）。
 */
export function gitDatesPlugin(
  factory: PluginFactoryContext,
): MdastPluginDefinition {
  const filePath = factory.fileURL
    ? relative(process.cwd(), fileURLToPath(factory.fileURL)).replaceAll(
        "\\",
        "/",
      )
    : "";

  return {
    name: "git-dates",
    before(_root, ctx) {
      if (!filePath) {
        return;
      }

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
        ([, subject]) => subject !== undefined && !ENGINEERING_COMMIT.test(subject),
      );
      // 历史里一条内容提交都没有的文件（例如只由 init / feat 引入）没有内容日期
      // 可用，退回全量历史：日期至少是稳定的，不会随构建时间漂移。
      const dated = contentCommits.length ? contentCommits : commits;

      const frontmatter = ctx.data.astro?.frontmatter;
      if (!frontmatter) {
        return;
      }

      const now = new Date();

      frontmatter.publishedAt ??= dated.length ? new Date(dated.at(-1)?.[0] ?? "") : now;
      frontmatter.updatedAt = dated.length ? new Date(dated[0]?.[0] ?? "") : now;
    },
  };
}
