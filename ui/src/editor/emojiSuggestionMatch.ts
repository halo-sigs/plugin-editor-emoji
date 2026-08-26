export interface EmojiSuggestionMatch {
  query: string
  range: {
    from: number
    to: number
  }
  text: string
}

export const findEmojiSuggestionTextMatch = (
  textBefore: string,
  cursorPosition: number,
): EmojiSuggestionMatch | null => {
  const match = textBefore.match(/(^|\s)(:([a-zA-Z0-9_+-]*))$/)
  if (!match) {
    return null
  }

  const text = match[2]!
  return {
    query: match[3]!,
    range: {
      from: cursorPosition - text.length,
      to: cursorPosition,
    },
    text,
  }
}
