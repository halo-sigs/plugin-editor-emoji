import { computePosition, flip, shift } from '@floating-ui/dom'
import { Editor, Extension, posToDOMRect, VueRenderer } from '@halo-dev/richtext-editor'
import Suggestion from '@tiptap/suggestion'
import EmojiPicker from './EmojiPicker.vue'
export const ExtensionEmoji = Extension.create({
  name: 'emoji-picker',
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: ':',
        command({ editor, range, props }) {
          editor.chain().focus().deleteRange(range).insertContent(props).run()
        },
        render() {
          let component: VueRenderer | null = null
          return {
            onStart: (props) => {
              component = new VueRenderer(EmojiPicker, {
                props,
                editor: props.editor,
              })
              if (!props.clientRect) {
                return
              }
              if (!component.element) {
                return
              }
              if (!(component.element instanceof HTMLElement)) {
                return
              }
              component.element.style.position = 'absolute'

              document.body.appendChild(component.element)

              updatePosition(props.editor, component.element)
            },

            onUpdate(props) {
              if (!component) {
                return
              }
              if (!component.element) {
                return
              }
              if (!(component.element instanceof HTMLElement)) {
                return
              }
              component.updateProps(props)

              if (!props.clientRect) {
                return
              }

              updatePosition(props.editor, component.element)
            },

            onExit() {
              component?.destroy()
            },
          }
        },
      }),
    ]
  },
})

const updatePosition = (editor: Editor, element: HTMLElement) => {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(editor.view, editor.state.selection.from, editor.state.selection.to),
  }

  computePosition(virtualElement, element, {
    placement: 'bottom-start',
    strategy: 'absolute',
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.position = strategy
    element.style.left = `${x}px`
    element.style.top = `${y}px`
  })
}
