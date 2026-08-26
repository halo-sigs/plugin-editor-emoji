import compactEmojiData from './emoji-data.generated.json'
import type { EmojiItem } from './emojiExtension'

type OptionalStrings = string[] | 0
type CompactEmoji = [
  name: string,
  emoji: string,
  aliases: OptionalStrings,
  tags: OptionalStrings,
  version: number,
  emoticons: OptionalStrings,
]
type CompactEmojiCategory = [id: string, name: string, emojiIndexes: number[]]

interface CompactEmojiData {
  e: CompactEmoji[]
  c: CompactEmojiCategory[]
}

export interface EmojiCategory {
  id: string
  name: string
  emojis: EmojiItem[]
}

const data = compactEmojiData as unknown as CompactEmojiData

export const tipTapEmojis: EmojiItem[] = data.e.map(
  ([name, emoji, aliases, tags, version, emoticons]) => ({
    name,
    emoji,
    shortcodes: [name, ...(aliases || [])],
    tags: tags || [],
    version: version || undefined,
    emoticons: emoticons || undefined,
  }),
)

export const emojiCategories: EmojiCategory[] = data.c.map(([id, name, emojiIndexes]) => ({
  id,
  name,
  emojis: emojiIndexes.map((emojiIndex) => tipTapEmojis[emojiIndex]!),
}))
