type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

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

const readLanguage = (element: HastNode): string => {
  const value =
    element.properties?.dataLanguage ?? element.properties?.["data-language"];

  return typeof value === "string" ? value : "";
};

/**
 * 给代码块挂一个右上角的语言角标。
 *
 * 这个插件排在 rehype-shiki 后面（自定义 rehype 插件都在高亮之后跑），所以这里能直接
 * 读到 shiki 写下的 data-language。角标要贴在代码块的框里、又不能跟着横向滚动跑掉，
 * 所以代码块外面套一层 .code-block 当作定位参照，pre 自己继续负责滚动。
 */
export function rehypeCodeLanguage() {
  return function (tree: HastNode) {
    const walk = (parent: HastNode): void => {
      const children = parent.children;

      if (children === undefined) {
        return;
      }

      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];

        if (child === undefined) {
          continue;
        }

        if (child.type === "element" && child.tagName === "pre") {
          const language = readLanguage(child);

          if (UNLABELLED.has(language.toLowerCase())) {
            continue;
          }

          children[index] = {
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
              child,
            ],
          };
          continue;
        }

        walk(child);
      }
    };

    walk(tree);
  };
}
