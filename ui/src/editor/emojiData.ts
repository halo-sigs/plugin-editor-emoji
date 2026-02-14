import emojiMartData, { type EmojiMartData } from '@emoji-mart/data'
import i18nZh from '@emoji-mart/data/i18n/zh.json'
import type { EmojiItem } from '@tiptap/extension-emoji'

export interface EmojiCategory {
  id: string
  name: string
  emojis: EmojiItem[]
}

export interface EmojiMartI18n {
  categories: Record<string, string>
  search: string
  search_no_results_1: string
  search_no_results_2: string
  pick: string
  add_custom: string
  [key: string]: string | Record<string, string>
}

/**
 * 将 @emoji-mart/data 的数据格式转换为 TipTap Emoji 扩展支持的格式
 */
export function convertEmojiMartDataToTipTap(locale: EmojiMartI18n = i18nZh): {
  emojis: EmojiItem[]
  categories: EmojiCategory[]
} {
  const { emojis, aliases, categories } = emojiMartData as EmojiMartData

  const emojiMap = new Map<string, EmojiItem>()
  const emojiItems: EmojiItem[] = []

  for (const [id, emoji] of Object.entries(emojis)) {
    const shortcodes = [id]

    for (const [alias, targetId] of Object.entries(aliases)) {
      if (targetId === id) {
        shortcodes.push(alias)
      }
    }

    const emojiItem: EmojiItem = {
      name: id,
      emoji: emoji.skins[0].native,
      shortcodes: shortcodes,
      tags: emoji.keywords || [],
      version: emoji.version,
      emoticons: emoji.emoticons,
    }

    emojiItems.push(emojiItem)
    emojiMap.set(id, emojiItem)
  }

  const categoryI18n = locale.categories as Record<string, string>
  const emojiCategories: EmojiCategory[] = categories.map(category => ({
    id: category.id,
    name: categoryI18n[category.id] || category.id,
    emojis: category.emojis
      .map(emojiId => emojiMap.get(emojiId))
      .filter(Boolean) as EmojiItem[]
  }))

  return {
    emojis: emojiItems,
    categories: emojiCategories,
  }
}

const { emojis, categories } = convertEmojiMartDataToTipTap()

export const tipTapEmojis = emojis
export const emojiCategories = categories

export function getEmojiDataWithLocale(locale: EmojiMartI18n) {
  return convertEmojiMartDataToTipTap(locale)
}
