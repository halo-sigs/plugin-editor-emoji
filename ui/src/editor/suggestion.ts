import { computePosition, flip, offset, shift } from '@floating-ui/dom'
import { VueRenderer } from '@halo-dev/richtext-editor'
import type { EmojiItem } from '@tiptap/extension-emoji'
import type { SuggestionOptions } from '@tiptap/suggestion'
import type { ExtendedEmojiStorage } from '.'
import EmojiPicker from './EmojiPicker.vue'

export const createEmojiSuggestion = (): Omit<SuggestionOptions<EmojiItem>, 'editor'> => {
  return {
    char: ':',

    command: ({ editor, range, props }) => {
      editor.chain().focus().deleteRange(range).setEmoji(props.name).run()
    },

    allow: ({ state, range }) => {
      const $from = state.doc.resolve(range.from)
      const type = state.schema.nodes.emoji
      return !!$from.parent.type.contentMatch.matchType(type)
    },

    render: () => {
      let component: VueRenderer
      let popup: HTMLElement | null = null

      const updatePosition = async (clientRect: (() => DOMRect | null) | null) => {
        if (!popup) {
          return
        }

        if (!clientRect) {
          return
        }

        const rect = clientRect()
        if (!rect) {
          return
        }

        const virtualElement = {
          getBoundingClientRect: () => rect,
        }

        const { x, y } = await computePosition(virtualElement, popup, {
          placement: 'bottom-start',
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        })

        Object.assign(popup.style, {
          left: `${x}px`,
          top: `${y}px`,
        })
      }

      return {
        onStart: (props) => {
          const emojiStorage = props.editor.storage.emoji as ExtendedEmojiStorage | undefined
          const showAllOnEmpty = emojiStorage?.commandMenuTriggered || false

          component = new VueRenderer(EmojiPicker, {
            props: {
              ...props,
              editor: props.editor,
              showAllOnEmpty,
            },
            editor: props.editor,
          })

          popup = component.element as HTMLElement

          Object.assign(popup.style, {
            position: 'absolute',
            zIndex: '9999',
            display: showAllOnEmpty ? 'block' : 'none',
          })

          document.body.appendChild(popup)

          if (props.clientRect && showAllOnEmpty) {
            updatePosition(props.clientRect)
          }
        },

        onUpdate(props) {
          if (!popup || !component) {
            return
          }

          const emojiStorage = props.editor.storage.emoji as ExtendedEmojiStorage | undefined
          const showAllOnEmpty = emojiStorage?.commandMenuTriggered || false

          if (!props.query && !showAllOnEmpty) {
            popup.style.display = 'none'
            return
          }

          popup.style.display = 'block'
          component.updateProps({
            ...props,
            editor: props.editor,
            showAllOnEmpty,
          })

          if (props.clientRect) {
            updatePosition(props.clientRect)
          }
        },

        onKeyDown(props) {
          if (!popup || popup.style.display === 'none') {
            return false
          }

          if (props.event.key === 'Escape') {
            if (popup) {
              popup.style.display = 'none'
            }
            return true
          }

          return component.ref?.onKeyDown?.(props.event) || false
        },

        onExit() {
          if (popup) {
            popup.remove()
          }
          if (component) {
            component.destroy()
          }
        },
      }
    },
  }
}
