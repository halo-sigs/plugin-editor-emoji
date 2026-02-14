import type { Editor, ExtensionOptions, Range } from '@halo-dev/richtext-editor'
import TipTapEmoji, { type EmojiOptions, type EmojiStorage } from '@tiptap/extension-emoji'
import { markRaw } from 'vue'
import StreamlineColorSmileyEmojiTerrified from '~icons/streamline-color/smiley-emoji-terrified'
import { tipTapEmojis } from './emojiData'
import { createEmojiSuggestion } from './suggestion'

export interface ExtendedEmojiStorage {
  commandMenuTriggered?: boolean
}

export const ExtensionEmoji = TipTapEmoji.configure({
  emojis: tipTapEmojis,
  enableEmoticons: true,
  suggestion: createEmojiSuggestion(),
  HTMLAttributes: {
    class: 'emoji-node',
  },
}).extend<EmojiOptions & ExtensionOptions, EmojiStorage & ExtendedEmojiStorage>({
  addStorage() {
    return {
      ...this.parent?.(),
      // 需要通过命令菜单触发时，设置为 true
      commandMenuTriggered: false,
    } as EmojiStorage & ExtendedEmojiStorage
  },

  addOptions() {
    return {
      ...this.parent?.(),
      getCommandMenuItems: () => {
        return {
          priority: 120,
          icon: markRaw(StreamlineColorSmileyEmojiTerrified),
          title: 'Emoji',
          keywords: ['emoji', '表情', 'biaoqing'],
          command: ({ editor, range }: { editor: Editor; range: Range }) => {
            const emojiStorage = editor.storage.emoji as ExtendedEmojiStorage
            emojiStorage.commandMenuTriggered = true
            editor.chain().focus().deleteRange(range).insertContent(':').run()

            setTimeout(() => {
              emojiStorage.commandMenuTriggered = false
            }, 100)
          },
        }
      },
    } as EmojiOptions & ExtensionOptions
  },
})
