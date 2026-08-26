import { describe, expect, it } from 'vitest'
import { emojiCategories, tipTapEmojis } from './emojiData'

describe('emoji data', () => {
  it('restores the compact catalogue without duplicating category entries', () => {
    expect(tipTapEmojis).toHaveLength(1870)
    expect(emojiCategories).toHaveLength(8)
    expect(emojiCategories.flatMap((category) => category.emojis)).toHaveLength(1870)
    expect(new Set(tipTapEmojis.map((emoji) => emoji.name)).size).toBe(1870)
    expect(emojiCategories.every((category) => category.emojis.every(Boolean))).toBe(true)
  })
})
