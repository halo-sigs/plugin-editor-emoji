import { VueRenderer } from '@halo-dev/richtext-editor'
import type { ExtendedEmojiStorage } from '.'
import type { EmojiItem } from './emojiExtension'
import type { EmojiSuggestionOptions, EmojiSuggestionProps } from './emojiSuggestionPlugin'

const loadEmojiPicker = () => Promise.all([import('@floating-ui/dom'), import('./EmojiPicker.vue')])

export const createEmojiSuggestion = (): Omit<EmojiSuggestionOptions<EmojiItem>, 'editor'> => {
  return {
    char: ':',

    command: ({ editor, range, props }) => {
      editor.chain().focus().deleteRange(range).setEmoji(props.name).run()
    },

    allow: ({ state, range }) => {
      const $from = state.doc.resolve(range.from)
      const type = state.schema.nodes.emoji
      return !!type && !!$from.parent.type.contentMatch.matchType(type)
    },

    render: () => {
      let component: VueRenderer | undefined
      let popup: HTMLElement | null = null
      let latestProps: EmojiSuggestionProps<EmojiItem> | undefined
      let loadToken = 0
      let showAllOnEmpty = false
      let positionPopup: ((clientRect: (() => DOMRect | null) | null) => Promise<void>) | undefined

      const destroyPopup = () => {
        popup?.remove()
        component?.destroy()
        popup = null
        component = undefined
        positionPopup = undefined
      }

      const mountPopup = async (token: number) => {
        const [{ computePosition, flip, offset, shift }, { default: EmojiPicker }] =
          await loadEmojiPicker()

        if (token !== loadToken || !latestProps) {
          return
        }

        const props = latestProps

        positionPopup = async (clientRect) => {
          if (!popup || !clientRect) {
            return
          }

          const rect = clientRect()
          if (!rect) {
            return
          }

          const { x, y } = await computePosition({ getBoundingClientRect: () => rect }, popup, {
            placement: 'bottom-start',
            middleware: [offset(8), flip(), shift({ padding: 8 })],
          })

          Object.assign(popup.style, {
            left: `${x}px`,
            top: `${y}px`,
          })
        }

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
          display: props.query || showAllOnEmpty ? 'block' : 'none',
        })
        document.body.appendChild(popup)

        if (props.clientRect && (props.query || showAllOnEmpty)) {
          await positionPopup(props.clientRect)
        }
      }

      return {
        onStart: (props) => {
          const emojiStorage = props.editor.storage.emoji as ExtendedEmojiStorage | undefined
          showAllOnEmpty = emojiStorage?.commandMenuTriggered || false
          latestProps = props
          destroyPopup()
          const token = ++loadToken
          void mountPopup(token).catch((error) => {
            if (token === loadToken) {
              console.error('Failed to load the emoji picker', error)
            }
          })
        },

        onUpdate(props) {
          latestProps = props
          if (!popup || !component) {
            return
          }

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

          if (props.clientRect && positionPopup) {
            void positionPopup(props.clientRect)
          }
        },

        onKeyDown(props) {
          if (!popup) {
            if (props.event.key === 'Escape') {
              latestProps = undefined
              loadToken += 1
              return true
            }
            return false
          }

          if (popup.style.display === 'none') {
            return false
          }

          if (props.event.key === 'Escape') {
            if (popup) {
              popup.style.display = 'none'
            }
            return true
          }

          return component?.ref?.onKeyDown?.(props.event) || false
        },

        onExit() {
          latestProps = undefined
          showAllOnEmpty = false
          loadToken += 1
          destroyPopup()
        },
      }
    },
  }
}
