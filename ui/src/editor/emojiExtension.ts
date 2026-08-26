import {
  combineTransactionSteps,
  escapeForRegEx,
  findChildrenInRange,
  getChangedRanges,
  InputRule,
  isFirefox,
  mergeAttributes,
  Node,
  nodeInputRule,
  PasteRule,
  Plugin,
  PluginKey,
  TextSelection,
  type Transaction,
} from '@halo-dev/richtext-editor'
import emojiRegex from 'emoji-regex'
import { isEmojiSupported } from 'is-emoji-supported'
import { createEmojiSuggestionPlugin, type EmojiSuggestionOptions } from './emojiSuggestionPlugin'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emoji: {
      setEmoji: (shortcode: string) => ReturnType
    }
  }

  interface Storage {
    emoji: EmojiStorage
  }
}

export interface EmojiItem {
  name: string
  emoji?: string
  shortcodes: string[]
  tags: string[]
  group?: string
  emoticons?: string[]
  version?: number
  fallbackImage?: string
  [key: string]: unknown
}

export interface EmojiOptions {
  HTMLAttributes: Record<string, unknown>
  emojis: EmojiItem[]
  enableEmoticons: boolean
  forceFallbackImages: boolean
  suggestion: Omit<EmojiSuggestionOptions<EmojiItem>, 'editor'>
}

export interface EmojiStorage {
  emojis: EmojiItem[]
  isSupported: (item: EmojiItem) => boolean
}

export const EmojiSuggestionPluginKey = new PluginKey('emojiSuggestion')
export const inputRegex = /:([a-zA-Z0-9_+-]+):$/
export const pasteRegex = /(^|\s):([a-zA-Z0-9_+-]+):/g

const removeVariationSelector = (value: string) =>
  value.replace('\u{FE0E}', '').replace('\u{FE0F}', '')

const shortcodeToEmoji = (shortcode: string, emojis: EmojiItem[]) =>
  emojis.find((item) => shortcode === item.name || item.shortcodes.includes(shortcode))

const emojiToShortcode = (emoji: string, emojis: EmojiItem[]) =>
  emojis.find((item) => item.emoji === removeVariationSelector(emoji))?.shortcodes[0]

const removeDuplicates = <T>(array: T[], by = JSON.stringify): T[] => {
  const seen: Record<string, boolean> = {}

  return array.filter((item) => {
    const key = by(item)
    return Object.prototype.hasOwnProperty.call(seen, key) ? false : (seen[key] = true)
  })
}

/**
 * Data-free variant of Tiptap's Emoji extension.
 *
 * The upstream package embeds its complete default emoji catalogue in the module. This extension
 * keeps the upstream 3.29 behavior while requiring callers to provide their own catalogue.
 */
export const Emoji = Node.create<EmojiOptions, EmojiStorage>({
  name: 'emoji',
  inline: true,
  group: 'inline',
  selectable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      emojis: [],
      enableEmoticons: false,
      forceFallbackImages: false,
      suggestion: {
        char: ':',
        pluginKey: EmojiSuggestionPluginKey,
        command: ({ editor, range, props }) => {
          const nodeAfter = editor.view.state.selection.$to.nodeAfter
          const overrideSpace = nodeAfter?.text?.startsWith(' ')

          if (overrideSpace) {
            range.to += 1
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: this.name, attrs: props },
              { type: 'text', text: ' ' },
            ])
            .command(({ tr, state }) => {
              tr.setStoredMarks(state.doc.resolve(state.selection.to - 2).marks())
              return true
            })
            .run()
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from)
          const type = state.schema.nodes[this.name]
          return !!type && !!$from.parent.type.contentMatch.matchType(type)
        },
      },
    }
  },

  addStorage() {
    const supportMap = removeDuplicates(this.options.emojis.map((item) => item.version))
      .filter((version) => typeof version === 'number')
      .reduce<Record<number, boolean>>((versions, version) => {
        const emoji = this.options.emojis.find(
          (item) => item.version === version && typeof item.emoji === 'string',
        )

        versions[version as number] = emoji ? isEmojiSupported(emoji.emoji as string) : false
        return versions
      }, {})

    return {
      emojis: this.options.emojis,
      isSupported: (emojiItem) =>
        emojiItem.version ? (supportMap[emojiItem.version] ?? false) : false,
    }
  },

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (element) => element.dataset.name,
        renderHTML: (attributes) => ({ 'data-name': attributes.name }),
      },
    }
  },

  parseHTML() {
    return [{ tag: `span[data-type="${this.name}"]` }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const emojiItem = shortcodeToEmoji(node.attrs.name, this.options.emojis)
    const attributes = mergeAttributes(HTMLAttributes, this.options.HTMLAttributes, {
      'data-type': this.name,
    })

    if (!emojiItem) {
      return ['span', attributes, `:${node.attrs.name}:`]
    }

    const isSupported = this.storage.isSupported(emojiItem)
    const hasEmoji = !!emojiItem.emoji
    const hasFallbackImage = !!emojiItem.fallbackImage
    const renderFallbackImage =
      (this.options.forceFallbackImages && !hasEmoji) ||
      (this.options.forceFallbackImages && hasFallbackImage) ||
      (this.options.forceFallbackImages && !isSupported && hasFallbackImage) ||
      ((!isSupported || !hasEmoji) && hasFallbackImage)

    return [
      'span',
      attributes,
      renderFallbackImage
        ? [
            'img',
            {
              src: emojiItem.fallbackImage,
              draggable: 'false',
              loading: 'lazy',
              align: 'absmiddle',
              alt: `${emojiItem.name} emoji`,
            },
          ]
        : emojiItem.emoji || `:${emojiItem.shortcodes[0]}:`,
    ]
  },

  renderText({ node }) {
    const emojiItem = shortcodeToEmoji(node.attrs.name, this.options.emojis)
    return emojiItem?.emoji || `:${node.attrs.name}:`
  },

  renderMarkdown: (node) => (node.attrs?.name ? `:${node.attrs.name}:` : ''),

  addCommands() {
    return {
      setEmoji:
        (shortcode) =>
        ({ chain }) => {
          const emojiItem = shortcodeToEmoji(shortcode, this.options.emojis)
          if (!emojiItem) {
            return false
          }

          chain()
            .insertContent({ type: this.name, attrs: { name: emojiItem.name } })
            .command(({ tr, state }) => {
              tr.setStoredMarks(state.doc.resolve(state.selection.to - 1).marks())
              return true
            })
            .run()
          return true
        },
    }
  },

  addInputRules() {
    const inputRules: InputRule[] = [
      new InputRule({
        find: inputRegex,
        handler: ({ range, match, chain }) => {
          const name = match[1]!
          if (!shortcodeToEmoji(name, this.options.emojis)) {
            return
          }

          chain()
            .insertContentAt(range, { type: this.name, attrs: { name } })
            .command(({ tr, state }) => {
              tr.setStoredMarks(state.doc.resolve(state.selection.to - 1).marks())
              return true
            })
            .run()
        },
      }),
    ]

    if (this.options.enableEmoticons) {
      const emoticons = this.options.emojis
        .flatMap((item) => item.emoticons)
        .filter((item): item is string => !!item)
      const emoticonRegex = new RegExp(
        `(?:^|\\s)(${emoticons.map((item) => escapeForRegEx(item)).join('|')}) $`,
      )

      inputRules.push(
        nodeInputRule({
          find: emoticonRegex,
          type: this.type,
          getAttributes: (match) => {
            const emoji = this.options.emojis.find((item) => item.emoticons?.includes(match[1]!))
            return emoji ? { name: emoji.name } : undefined
          },
        }),
      )
    }

    return inputRules
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: pasteRegex,
        handler: ({ range, match, chain }) => {
          const prefix = match[1] || ''
          const name = match[2]!
          if (!shortcodeToEmoji(name, this.options.emojis)) {
            return
          }

          chain()
            .insertContentAt(
              { from: range.from + prefix.length, to: range.to },
              { type: this.name, attrs: { name } },
              { updateSelection: false },
            )
            .command(({ tr, state }) => {
              tr.setStoredMarks(state.doc.resolve(state.selection.to - 1).marks())
              return true
            })
            .run()
        },
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      createEmojiSuggestionPlugin({ editor: this.editor, ...this.options.suggestion }),
      new Plugin({
        key: new PluginKey('emoji'),
        props: {
          handleKeyDown: (view, event) => {
            if (!isFirefox()) {
              return false
            }

            const isLeft = event.key === 'ArrowLeft'
            const isRight = event.key === 'ArrowRight'
            if (
              (!isLeft && !isRight) ||
              event.shiftKey ||
              event.ctrlKey ||
              event.altKey ||
              event.metaKey
            ) {
              return false
            }

            const { selection } = view.state
            if (!selection.empty || !(selection instanceof TextSelection)) {
              return false
            }

            const $pos = selection.$from
            const adjacentNode = isLeft ? $pos.nodeBefore : $pos.nodeAfter
            if (!adjacentNode || adjacentNode.type !== this.type) {
              return false
            }

            const newPos = isLeft
              ? $pos.pos - adjacentNode.nodeSize
              : $pos.pos + adjacentNode.nodeSize
            if (newPos < $pos.start() || newPos > $pos.end()) {
              return false
            }

            view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, newPos)))
            return true
          },
          handleDoubleClickOn: (_view, pos, node) => {
            if (node.type !== this.type) {
              return false
            }

            this.editor.commands.setTextSelection({ from: pos, to: pos + node.nodeSize })
            return true
          },
        },
        appendTransaction: (transactions, oldState, newState) => {
          if (this.editor.view.composing) {
            return
          }

          const docChanged =
            transactions.some((transaction) => transaction.docChanged) &&
            !oldState.doc.eq(newState.doc)
          if (!docChanged) {
            return
          }

          const { tr } = newState
          const transform = combineTransactionSteps(oldState.doc, transactions as Transaction[])

          getChangedRanges(transform).forEach(({ newRange }) => {
            if (newState.doc.resolve(newRange.from).parent.type.spec.code) {
              return
            }

            findChildrenInRange(newState.doc, newRange, (node) => node.type.isText).forEach(
              ({ node, pos }) => {
                if (!node.text) {
                  return
                }

                for (const match of node.text.matchAll(emojiRegex())) {
                  if (match.index === undefined) {
                    continue
                  }

                  const name = emojiToShortcode(match[0], this.options.emojis)
                  if (!name) {
                    continue
                  }

                  const from = tr.mapping.map(pos + match.index)
                  if (newState.doc.resolve(from).parent.type.spec.code) {
                    continue
                  }

                  tr.replaceRangeWith(from, from + match[0].length, this.type.create({ name }))
                  tr.setStoredMarks(newState.doc.resolve(from).marks())
                }
              },
            )
          })

          return tr.steps.length ? tr : undefined
        },
      }),
    ]
  },
})

export default Emoji
