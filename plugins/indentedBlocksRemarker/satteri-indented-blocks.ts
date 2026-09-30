import type { MdastContent, MdastPluginDefinition, PluginFactoryContext } from "satteri";
import { markdownToMdast } from "satteri";

/** 围栏代码块的开头：最多三个空格缩进 + 三个以上的反引号或波浪号。 */
const FENCE_START = /^ {0,3}(`{3,}|~{3,})/;

/** 旁注用的 class，样式见 src/styles/article.css。 */
const INDENTED_NOTE_CLASS = "indented-note";

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

      const parsed = markdownToMdast(node.value);
      const children = parsed.type === "root" ? parsed.children : [parsed];

      const notes: MdastContent[] = children.map((child) => ({
        ...child,
        data: {
          ...child.data,
          hProperties: { className: [INDENTED_NOTE_CLASS] },
        },
      }));

      if (notes.length === 0) {
        ctx.removeNode(node);
        return;
      }

      ctx.replaceNode(node, notes);
    },
  };
}
