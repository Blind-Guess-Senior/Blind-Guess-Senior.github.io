import type { MdastContent, MdastPluginDefinition, PluginFactoryContext } from "satteri";
import { markdownToMdast } from "satteri";

/** 围栏代码块的开头：最多三个空格缩进 + 三个以上的反引号或波浪号。 */
const FENCE_START = /^ {0,3}(`{3,}|~{3,})/;

/** 旁注用的 class，样式见 src/styles/article.css。 */
const INDENTED_NOTE_CLASS = "indented-note";

/** 只用到解析结果里的这几个字段，省得跟 satteri 的节点联合类型较劲。 */
type NoteNode = {
  type: string;
  value?: string;
  data?: Record<string, unknown>;
  children?: NoteNode[];
};

/**
 * 把段落里的软换行（text 值里的 `\n`）换成硬换行。
 *
 * 缩进块在 CommonMark 里是代码块，<pre> 会把每个换行原样渲染出来；还原成正文后
 * 软换行只会变成空格，几行会被拼成一整段，所以在树上补回 break 节点。代码块之类
 * 没有 children 的节点不受影响。
 */
function withHardBreaks(node: NoteNode): NoteNode {
  if (node.children === undefined) {
    return node;
  }

  const next: NoteNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value?.includes("\n")) {
      child.value.split("\n").forEach((line, index) => {
        if (index > 0) {
          next.push({ type: "break" });
        }
        if (line !== "") {
          next.push({ ...child, value: line });
        }
      });
      continue;
    }

    next.push(withHardBreaks(child));
  }

  return { ...node, children: next };
}

/**
 * Obsidian 里用 Tab（或四个空格）缩进写的旁注，在 CommonMark 里就是缩进代码块：
 * 渲染出来和真正的代码块一模一样，行内代码、链接全成了纯文本。
 *
 * 这里把「不是围栏」的代码块按正文重新解析一遍再放回原处，于是内容照常支持行内
 * markdown，缩进本身则交给 .indented-note 的样式去表达。
 *
 * 缩进代码块和围栏代码块在 mdast 里都是 code 节点（没写语言的围栏 lang 同样是
 * null），只能回头看源码里那一行是不是围栏。缩进块至少缩进四个空格或一个 Tab，
 * 所以「行首最多三个空格 + 围栏」这个判断不会误伤它 —— 这也是 options.position
 * 开着的原因：要看源码那一行就得有位置信息。
 */
export function indentedBlocksPlugin(
  factory: PluginFactoryContext,
): MdastPluginDefinition {
  const source = factory.source;

  return {
    name: "indented-blocks",
    options: { position: true },
    code(node, ctx) {
      // 围栏块（哪怕没写语言）保持代码块的样子，只改缩进块。
      if (node.lang) {
        return;
      }

      const offset = node.position?.start.offset;
      if (offset === undefined || FENCE_START.test(source.slice(offset))) {
        return;
      }

      const parsed = markdownToMdast(node.value) as unknown as NoteNode;
      const children = parsed.children ?? [];

      const notes = children.map((child) => {
        const note = withHardBreaks(child);

        return {
          ...note,
          data: {
            ...note.data,
            hProperties: { className: [INDENTED_NOTE_CLASS] },
          },
        } as unknown as MdastContent;
      });

      if (notes.length === 0) {
        ctx.removeNode(node);
        return;
      }

      ctx.replaceNode(node, notes);
    },
  };
}
