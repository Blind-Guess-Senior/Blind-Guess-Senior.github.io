import type { HastNode, HastPluginDefinition } from "satteri";

/**
 * 代码块角标上显示的名字。shiki 写在 data-language 里的是源码里标的那个 id，
 * 跟展示用的名字不完全一样（cpp → C++），这里补一层映射，没收录的就照原样显示。
 */
const LANGUAGE_LABELS: Record<string, string> = {
  bash: "Bash",
  bat: "Batch",
  c: "C",
  cmake: "CMake",
  cmd: "CMD",
  cpp: "C++",
  cs: "C#",
  csharp: "C#",
  css: "CSS",
  html: "HTML",
  java: "Java",
  js: "JavaScript",
  json: "JSON",
  jsx: "JSX",
  markdown: "Markdown",
  md: "Markdown",
  nix: "Nix",
  powershell: "PowerShell",
  ps1: "PowerShell",
  py: "Python",
  python: "Python",
  rs: "Rust",
  rust: "Rust",
  sh: "Shell",
  shell: "Shell",
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  yaml: "YAML",
  yml: "YAML",
  zsh: "Zsh",
};

/** 没写明语言的代码块（data-language 是 plaintext）不挂角标。 */
const UNLABELLED = new Set(["", "plaintext", "text", "txt"]);

const readLanguage = (node: Readonly<HastNode>): string => {
  if (node.type !== "element") {
    return "";
  }

  const value =
    node.properties?.dataLanguage ?? node.properties?.["data-language"];

  return typeof value === "string" ? value : "";
};

/**
 * 给代码块挂一个右上角的语言角标。
 *
 * 这个插件排在 satteri 自带的 highlight 插件后面（用户 hast 插件都在高亮之后
 * 跑），所以这里能直接读到它写下的 data-language。角标要贴在代码块的框里、
 * 又不能跟着横向滚动跑掉，所以用 wrapNode 把 pre 包进 .code-block：pre 是包装
 * 层的第一个孩子，声明的 span 跟在后面，定位参照就是这一层。
 */
export function codeLanguagePlugin(): HastPluginDefinition {
  return {
    name: "code-language",
    element: {
      filter: ["pre"],
      visit(node, ctx) {
        const language = readLanguage(node);

        if (UNLABELLED.has(language.toLowerCase())) {
          return;
        }

        ctx.wrapNode(node, {
          type: "element",
          tagName: "div",
          properties: { className: ["code-block"] },
          children: [
            {
              type: "element",
              tagName: "span",
              properties: { className: ["code-lang"] },
              children: [
                {
                  type: "text",
                  value: LANGUAGE_LABELS[language.toLowerCase()] ?? language,
                },
              ],
            },
          ],
        });
      },
    },
  };
}
