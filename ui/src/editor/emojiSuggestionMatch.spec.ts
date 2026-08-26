import { describe, expect, it } from 'vitest'
import { findEmojiSuggestionTextMatch } from './emojiSuggestionMatch'

describe('emoji suggestion matching', () => {
  it('matches an empty or populated shortcode at a valid text boundary', () => {
    expect(findEmojiSuggestionTextMatch(':', 1)).toEqual({
      query: '',
      range: { from: 0, to: 1 },
      text: ':',
    })
    expect(findEmojiSuggestionTextMatch('Hello :smile', 12)).toEqual({
      query: 'smile',
      range: { from: 6, to: 12 },
      text: ':smile',
    })
  })

  it('does not match inside a word or after unsupported shortcode characters', () => {
    expect(findEmojiSuggestionTextMatch('Hello:smile', 11)).toBeNull()
    expect(findEmojiSuggestionTextMatch(':smile!', 7)).toBeNull()
  })
})
