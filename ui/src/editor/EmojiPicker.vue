<script lang="ts" setup>
import type { Editor } from '@halo-dev/richtext-editor'
import type { EmojiItem } from '@tiptap/extension-emoji'
import { computed, ref, watch } from 'vue'
import { emojiCategories, type EmojiCategory } from './emojiData'

const props = defineProps<{
  command: (item: EmojiItem) => void
  editor: Editor
  query: string
  showAllOnEmpty?: boolean
}>()

// 一行显示几个 emoji
const COLUMNS = 9

interface Position {
  categoryIndex: number
  row: number
  column: number
}

const selectedPosition = ref<Position>({ categoryIndex: 0, row: 0, column: 0 })
const isLoading = ref(false)

const searchEmojisByCategory = (query: string, showAllOnEmpty = false): EmojiCategory[] => {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    if (showAllOnEmpty) {
      return emojiCategories.map((category) => ({
        id: category.id,
        name: category.name,
        emojis: category.emojis,
      }))
    }
    return []
  }

  const lowerQuery = trimmedQuery.toLowerCase()
  const results: EmojiCategory[] = []

  for (const category of emojiCategories) {
    const matchedEmojis = category.emojis.filter((emoji) => {
      if (emoji.name.toLowerCase().includes(lowerQuery)) {
        return true
      }

      if (emoji.shortcodes.some((code) => code.toLowerCase().includes(lowerQuery))) {
        return true
      }

      if (emoji.tags && emoji.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))) {
        return true
      }

      return false
    })

    if (matchedEmojis.length > 0) {
      results.push({
        id: category.id,
        name: category.name,
        emojis: matchedEmojis,
      })
    }
  }

  return results
}

const categoriesWithEmojis = computed(() =>
  searchEmojisByCategory(props.query, props.showAllOnEmpty),
)

watch(
  categoriesWithEmojis,
  () => {
    selectedPosition.value = { categoryIndex: 0, row: 0, column: 0 }
  },
  { immediate: true },
)

const selectEmoji = (emoji: EmojiItem) => {
  props.command(emoji)
}

const getCategoryRows = (categoryIndex: number): number => {
  const category = categoriesWithEmojis.value[categoryIndex]
  if (!category) {
    return 0
  }
  return Math.ceil(category.emojis.length / COLUMNS)
}

const getCategoryRowColumns = (categoryIndex: number, row: number): number => {
  const category = categoriesWithEmojis.value[categoryIndex]
  if (!category) {
    return 0
  }

  const startIndex = row * COLUMNS
  const remaining = category.emojis.length - startIndex
  return Math.min(COLUMNS, Math.max(0, remaining))
}

const upHandler = () => {
  if (categoriesWithEmojis.value.length === 0) {
    return
  }

  const pos = selectedPosition.value

  if (pos.row > 0) {
    const newRow = pos.row - 1
    const maxCol = getCategoryRowColumns(pos.categoryIndex, newRow) - 1
    selectedPosition.value = {
      categoryIndex: pos.categoryIndex,
      row: newRow,
      column: Math.min(pos.column, maxCol),
    }
  } else {
    const prevCategoryIndex =
      pos.categoryIndex > 0 ? pos.categoryIndex - 1 : categoriesWithEmojis.value.length - 1

    const lastRow = getCategoryRows(prevCategoryIndex) - 1
    const maxCol = getCategoryRowColumns(prevCategoryIndex, lastRow) - 1

    selectedPosition.value = {
      categoryIndex: prevCategoryIndex,
      row: lastRow,
      column: Math.min(pos.column, maxCol),
    }
  }
}

const downHandler = () => {
  if (categoriesWithEmojis.value.length === 0) {
    return
  }

  const pos = selectedPosition.value
  const totalRows = getCategoryRows(pos.categoryIndex)

  if (pos.row < totalRows - 1) {
    const newRow = pos.row + 1
    const maxCol = getCategoryRowColumns(pos.categoryIndex, newRow) - 1
    selectedPosition.value = {
      categoryIndex: pos.categoryIndex,
      row: newRow,
      column: Math.min(pos.column, maxCol),
    }
  } else {
    const nextCategoryIndex =
      pos.categoryIndex < categoriesWithEmojis.value.length - 1 ? pos.categoryIndex + 1 : 0

    const maxCol = getCategoryRowColumns(nextCategoryIndex, 0) - 1

    selectedPosition.value = {
      categoryIndex: nextCategoryIndex,
      row: 0,
      column: Math.min(pos.column, maxCol),
    }
  }
}

const leftHandler = () => {
  if (categoriesWithEmojis.value.length === 0) {
    return
  }

  const pos = selectedPosition.value

  if (pos.column > 0) {
    selectedPosition.value = {
      ...pos,
      column: pos.column - 1,
    }
  } else {
    if (pos.row > 0) {
      const newRow = pos.row - 1
      const maxCol = getCategoryRowColumns(pos.categoryIndex, newRow) - 1
      selectedPosition.value = {
        categoryIndex: pos.categoryIndex,
        row: newRow,
        column: maxCol,
      }
    } else {
      const prevCategoryIndex =
        pos.categoryIndex > 0 ? pos.categoryIndex - 1 : categoriesWithEmojis.value.length - 1

      const lastRow = getCategoryRows(prevCategoryIndex) - 1
      const maxCol = getCategoryRowColumns(prevCategoryIndex, lastRow) - 1

      selectedPosition.value = {
        categoryIndex: prevCategoryIndex,
        row: lastRow,
        column: maxCol,
      }
    }
  }
}

const rightHandler = () => {
  if (categoriesWithEmojis.value.length === 0) {
    return
  }

  const pos = selectedPosition.value
  const maxCol = getCategoryRowColumns(pos.categoryIndex, pos.row) - 1

  if (pos.column < maxCol) {
    selectedPosition.value = {
      ...pos,
      column: pos.column + 1,
    }
  } else {
    const totalRows = getCategoryRows(pos.categoryIndex)

    if (pos.row < totalRows - 1) {
      selectedPosition.value = {
        categoryIndex: pos.categoryIndex,
        row: pos.row + 1,
        column: 0,
      }
    } else {
      const nextCategoryIndex =
        pos.categoryIndex < categoriesWithEmojis.value.length - 1 ? pos.categoryIndex + 1 : 0

      selectedPosition.value = {
        categoryIndex: nextCategoryIndex,
        row: 0,
        column: 0,
      }
    }
  }
}

const getCurrentEmoji = () => {
  const pos = selectedPosition.value
  const category = categoriesWithEmojis.value[pos.categoryIndex]
  if (!category) {
    return
  }

  const index = pos.row * COLUMNS + pos.column
  return category.emojis[index]
}

const enterHandler = () => {
  const emoji = getCurrentEmoji()
  if (emoji) {
    selectEmoji(emoji)
  }
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowUp') {
    upHandler()
    return true
  }

  if (event.key === 'ArrowDown') {
    downHandler()
    return true
  }

  if (event.key === 'ArrowLeft') {
    leftHandler()
    return true
  }

  if (event.key === 'ArrowRight') {
    rightHandler()
    return true
  }

  if (event.key === 'Enter') {
    enterHandler()
    return true
  }

  return false
}

const isEmojiSelected = (categoryIndex: number, emojiIndex: number): boolean => {
  const pos = selectedPosition.value
  if (pos.categoryIndex !== categoryIndex) {
    return false
  }

  const targetRow = Math.floor(emojiIndex / COLUMNS)
  const targetCol = emojiIndex % COLUMNS

  return pos.row === targetRow && pos.column === targetCol
}

const scrollToSelected = () => {
  const selected = document.querySelector('.emoji-item--selected')
  if (selected) {
    selected.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}

watch(
  selectedPosition,
  () => {
    setTimeout(() => {
      scrollToSelected()
    }, 0)
  },
  { deep: true },
)

defineExpose({
  onKeyDown,
})
</script>

<template>
  <div class="emoji-picker">
    <div v-if="isLoading" class="emoji-picker-loading">
      <span>加载中...</span>
    </div>
    <div v-else-if="categoriesWithEmojis.length === 0" class="emoji-picker-empty">
      <span>未找到 emoji</span>
    </div>
    <div v-else class="emoji-picker-content">
      <div
        v-for="(category, categoryIndex) in categoriesWithEmojis"
        :key="category.id"
        class="emoji-category"
      >
        <div class="emoji-category-title">{{ category.name }}</div>
        <div class="emoji-grid">
          <button
            v-for="(emoji, emojiIndex) in category.emojis"
            :key="emoji.name"
            type="button"
            class="emoji-item"
            :class="{ 'emoji-item--selected': isEmojiSelected(categoryIndex, emojiIndex) }"
            :title="`:${emoji.shortcodes[0]}:`"
            @click="selectEmoji(emoji)"
          >
            {{ emoji.emoji }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.emoji-picker {
  background: #fff;
  border-radius: 8px;
  box-shadow:
    0 3px 12px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  width: 352px;
  max-height: 380px;

  &-loading,
  &-empty {
    padding: 24px;
    text-align: center;
    color: rgba(0, 0, 0, 0.45);
    font-size: 14px;
  }

  &-content {
    overflow-y: auto;
    max-height: 380px;
    padding: 8px 4px;
  }
}

.emoji-category {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 8px;
  }

  &-title {
    font-size: 12px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.65);
    padding: 8px 12px 4px;
    text-transform: capitalize;
  }
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 2px;
  padding: 0 4px;
}

.emoji-item {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease;
  padding: 0;
  line-height: 1;

  &:hover {
    background-color: rgba(0, 0, 0, 0.06);
  }

  &--selected {
    background-color: rgba(55, 53, 47, 0.08);
  }

  &:active {
    transform: scale(0.95);
  }
}

.emoji-picker-content::-webkit-scrollbar {
  width: 8px;
}

.emoji-picker-content::-webkit-scrollbar-track {
  background: transparent;
}

.emoji-picker-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;

  &:hover {
    background: rgba(0, 0, 0, 0.18);
    background-clip: content-box;
  }
}
</style>
