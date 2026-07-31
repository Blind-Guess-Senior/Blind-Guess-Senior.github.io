import { basename, extname } from "node:path";
import { toString } from "mdast-util-to-string";

const DESCRIPTION_MAX_LENGTH = 160;

function truncate(text, maxLength) {
  const characters = Array.from(text);

  if (characters.length <= maxLength) {
    return text;
  }

  return `${characters.slice(0, maxLength).join("")}…`;
}

export function remarkDocumentMetadata() {
  return function (tree, file) {
    const fileName = file.history[0];

    const title = basename(fileName, extname(fileName));

    const paragraph = tree.children.find(
      (node) => node.type === "paragraph" && toString(node).trim().length > 0,
    );

    const description = paragraph
      ? truncate(
          toString(paragraph).replace(/\s+/g, " ").trim(),
          DESCRIPTION_MAX_LENGTH,
        )
      : "";

    file.data.astro ??= {};
    file.data.astro.frontmatter ??= {};

    file.data.astro.frontmatter.title = title;
    file.data.astro.frontmatter.description = description;
  };
}
