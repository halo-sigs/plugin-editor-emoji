import type { Editor, EditorState, EditorView, Range } from '@halo-dev/richtext-editor'
import { Plugin, PluginKey } from '@halo-dev/richtext-editor'
import {
  findEmojiSuggestionTextMatch,
  type EmojiSuggestionMatch as SuggestionMatch,
} from './emojiSuggestionMatch'

export interface EmojiSuggestionProps<TItem> extends SuggestionMatch {
  clientRect: (() => DOMRect | null) | null
  command: (item: TItem) => void
  editor: Editor
}

export interface EmojiSuggestionKeyDownProps {
  event: KeyboardEvent
  range: Range
  view: EditorView
}

export interface EmojiSuggestionRenderer<TItem> {
  onExit?: () => void
  onKeyDown?: (props: EmojiSuggestionKeyDownProps) => boolean
  onStart?: (props: EmojiSuggestionProps<TItem>) => void
  onUpdate?: (props: EmojiSuggestionProps<TItem>) => void
}

export interface EmojiSuggestionOptions<TItem> {
  allow?: (props: { editor: Editor; range: Range; state: EditorState }) => boolean
  char: ':'
  command: (props: { editor: Editor; props: TItem; range: Range }) => void
  editor: Editor
  pluginKey?: PluginKey
  render?: () => EmojiSuggestionRenderer<TItem>
}

const findSuggestionMatch = (state: EditorState): SuggestionMatch | null => {
  const { selection } = state
  if (!selection.empty) {
    return null
  }

  const { $from } = selection
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc')
  return findEmojiSuggestionTextMatch(textBefore, selection.from)
}

const createClientRect = (view: EditorView, range: Range) => () => {
  try {
    const from = view.coordsAtPos(range.from)
    const to = view.coordsAtPos(range.to)
    const left = from.left
    const top = Math.min(from.top, to.top)
    const right = Math.max(from.right, to.right, left + 1)
    const bottom = Math.max(from.bottom, to.bottom, top + 1)

    return new DOMRect(left, top, right - left, bottom - top)
  } catch {
    return null
  }
}

export const createEmojiSuggestionPlugin = <TItem>(options: EmojiSuggestionOptions<TItem>) => {
  const pluginKey = options.pluginKey ?? new PluginKey('emojiSuggestion')
  const renderer = options.render?.() ?? {}

  const createProps = (view: EditorView, match: SuggestionMatch): EmojiSuggestionProps<TItem> => ({
    ...match,
    clientRect: createClientRect(view, match.range),
    command: (item) => options.command({ editor: options.editor, range: match.range, props: item }),
    editor: options.editor,
  })

  return new Plugin<SuggestionMatch | null>({
    key: pluginKey,
    state: {
      init: (_, state) => findSuggestionMatch(state),
      apply: (_, __, ___, state) => {
        const match = findSuggestionMatch(state)
        if (
          !match ||
          options.allow?.({ editor: options.editor, range: match.range, state }) === false
        ) {
          return null
        }
        return match
      },
    },
    props: {
      handleKeyDown: (view, event) => {
        const match = pluginKey.getState(view.state) as SuggestionMatch | null
        if (!match) {
          return false
        }

        return renderer.onKeyDown?.({ event, range: match.range, view }) ?? false
      },
    },
    view: () => ({
      update: (updatedView, previousState) => {
        const previous = pluginKey.getState(previousState) as SuggestionMatch | null
        const current = pluginKey.getState(updatedView.state) as SuggestionMatch | null

        if (!previous && current) {
          renderer.onStart?.(createProps(updatedView, current))
          return
        }

        if (previous && !current) {
          renderer.onExit?.()
          return
        }

        if (
          previous &&
          current &&
          (previous.query !== current.query ||
            previous.range.from !== current.range.from ||
            previous.range.to !== current.range.to)
        ) {
          renderer.onUpdate?.(createProps(updatedView, current))
        }
      },
      destroy: () => renderer.onExit?.(),
    }),
  })
}
