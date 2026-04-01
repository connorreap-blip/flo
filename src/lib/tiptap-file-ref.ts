import { Node, mergeAttributes } from "@tiptap/core";

export const FileRef = Node.create({
  name: "fileRef",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      relativePath: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-file-ref"),
        renderHTML: (attributes: { relativePath?: string | null }) =>
          attributes.relativePath ? { "data-file-ref": attributes.relativePath } : {},
      },
      name: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-file-name"),
        renderHTML: (attributes: { name?: string | null }) =>
          attributes.name ? { "data-file-name": attributes.name } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-file-ref]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const name = typeof HTMLAttributes.name === "string" ? HTMLAttributes.name : "File";

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "file-ref",
      }),
      name,
    ];
  },
});
