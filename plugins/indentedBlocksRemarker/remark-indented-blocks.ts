import type { Code, Root, RootContent } from "mdast";
import type { VFile } from "vfile";

/** 围栏代码块的开头：最多三个空格缩进 + 三个以上的反引号或波浪号。 */
const FENCE_START = /^ {0,3}(`{3,}|~{3,})/;

/** 旁注用的 class，样式见 src/styles/article.css。 */
const INDENTED_NOTE_CLASS = "indented-note";

/** 这里只需要 processor 的 parse；unified 不是本仓库的直接依赖，就不引它的类型了。 */
type MarkdownParser = {
  parse: (value: string) => unknown;
};

/**
 * Obsidian 里用 Tab（或四个空格）缩进写的旁注，在 CommonMark 里就是缩进代码块：
 * 渲染出来和真正的代码块一模一样，行内代码、链接全成了纯文本。
 *
 * 这里把「不是围栏」的代码块按正文重新解析一遍再放回原处，于是内容照常支持行内
 * markdown，缩进本身则交给 .indented-note 的样式去表达。
 *
 * 缩进代码块和围栏代码块在 mdast 里都是 code 节点（没写语言的围栏 lang 同样是
 * null），只能回头看源码里那一行是不是围栏。缩进块至少缩进四个空格或一个 Tab，
 * 所以「行首最多三个空格 + 围栏」这个判断不会误伤它。
 */
export function remarkIndentedBlocks(this: MarkdownParser) {
  const parser = this;

  return function (tree: Root, file: VFile) {
    const source = String(file.value);

    const isFence = (node: Code): boolean => {
      const offset = node.position?.start.offset;

      // 连源码位置都没有的话分不清来源，按围栏处理，宁可不动。
      return offset === undefined || FENCE_START.test(source.slice(offset));
    };

    const walk = (parent: { children: RootContent[] }): void => {
      for (let index = 0; index < parent.children.length; index += 1) {
        const child = parent.children[index];

        if (child === undefined) {
          continue;
        }

        if (child.type === "code") {
          // 围栏块（哪怕没写语言）保持代码块的样子，只改缩进块。
          if (isFence(child)) {
            continue;
          }

          const parsed = parser.parse(child.value) as Root;
          const notes = parsed.children.map((node) => {
            node.data = {
              ...node.data,
              hProperties: { className: [INDENTED_NOTE_CLASS] },
            };

            return node;
          });

          parent.children.splice(index, 1, ...notes);
          index += notes.length - 1;
          continue;
        }

        if ("children" in child) {
          walk(child as { children: RootContent[] });
        }
      }
    };

    walk(tree);
  };
}
