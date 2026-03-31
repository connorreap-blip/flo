import { Node, mergeAttributes } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { exitSuggestion } from "@tiptap/suggestion";
import type { SuggestionMatch } from "@tiptap/suggestion";
import { WikilinkSuggestion } from "../components/WikilinkSuggestion";
import type {
  WikilinkSuggestionHandle,
  WikilinkSuggestionItem,
} from "../components/WikilinkSuggestion";
import { useCanvasStore } from "../store/canvas-store";

export const WIKILINK_PLUGIN_KEY = new PluginKey("flo-wikilink");

function fuzzyScore(text: string, query: string) {
  const haystack = text.toLowerCase();
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return 0;
  }

  if (haystack.includes(needle)) {
    return needle.length * 10 - haystack.indexOf(needle);
  }

  let score = 0;
  let cursor = 0;

  for (const char of needle) {
    const nextIndex = haystack.indexOf(char, cursor);
    if (nextIndex === -1) {
      return -1;
    }
    score += 2;
    if (nextIndex === cursor) {
      score += 3;
    }
    cursor = nextIndex + 1;
  }

  return score;
}

function findWikilinkMatch({
  $position,
}: {
  char: string;
  allowSpaces: boolean;
  allowToIncludeChar: boolean;
  allowedPrefixes: string[] | null;
  startOfLine: boolean;
  $position: import("@tiptap/pm/model").ResolvedPos;
}): SuggestionMatch {
  const textBefore = $position.parent.textBetween(0, $position.parentOffset, undefined, "\ufffc");
  const match = /\[\[([^[\]]]*)$/.exec(textBefore);

  if (!match) {
    return null;
  }

  const from = $position.start() + match.index;
  const to = from + match[0].length;

  return {
    range: { from, to },
    query: match[1],
    text: match[0],
  };
}

export const Wikilink = Node.create({
  name: "wikilink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      title: {
        default: null,
      },
      cardId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-wikilink]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const title = typeof HTMLAttributes.title === "string" ? HTMLAttributes.title : "";

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-wikilink": title,
        class: "wikilink",
      }),
      `[[${title}]]`,
    ];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<WikilinkSuggestionItem, WikilinkSuggestionItem>({
        editor: this.editor,
        pluginKey: WIKILINK_PLUGIN_KEY,
        char: "[",
        allowSpaces: true,
        allowedPrefixes: null,
        findSuggestionMatch: findWikilinkMatch,
        items: ({ query }) => {
          const cards = useCanvasStore.getState().cards;

          return cards
            .map((card) => ({
              id: card.id,
              title: card.title || "Untitled",
            }))
            .map((item) => ({ item, score: fuzzyScore(item.title, query) }))
            .filter((entry) => entry.score >= 0)
            .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title))
            .map((entry) => entry.item);
        },
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: {
                  title: props.title,
                  cardId: props.id,
                },
              },
              {
                type: "text",
                text: " ",
              },
            ])
            .run();
        },
        render: () => {
          let renderer: ReactRenderer<WikilinkSuggestionHandle> | null = null;
          let hostElement: HTMLElement | null = null;

          return {
            onStart: (props) => {
              renderer = new ReactRenderer(WikilinkSuggestion, {
                editor: props.editor,
                props: {
                  items: props.items,
                  query: props.query,
                  clientRect: props.clientRect,
                  command: props.command,
                },
              });

              hostElement = renderer.element;
              document.body.appendChild(hostElement);
            },
            onUpdate: (props) => {
              renderer?.updateProps({
                items: props.items,
                query: props.query,
                clientRect: props.clientRect,
                command: props.command,
              });
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                exitSuggestion(props.view, WIKILINK_PLUGIN_KEY);
                return true;
              }

              return renderer?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit: () => {
              renderer?.destroy();
              if (hostElement?.parentNode) {
                hostElement.parentNode.removeChild(hostElement);
              }
              renderer = null;
              hostElement = null;
            },
          };
        },
      }),
    ];
  },
});
