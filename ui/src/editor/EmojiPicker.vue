<script lang="ts" setup>
import i18n from '@emoji-mart/data/i18n/zh.json'
import { Toast, VLoading } from '@halo-dev/components'
import type { Editor } from '@halo-dev/richtext-editor'
import { useEventListener } from '@vueuse/core'
import { onMounted, ref, useTemplateRef } from 'vue'

const props = defineProps<{
  command: (item: string) => void
  editor: Editor
}>()

const container = useTemplateRef<HTMLElement>('container')

const isLoading = ref(false)

async function init() {
  try {
    isLoading.value = true

    const { Picker } = await import('emoji-mart')
    const data = await import('@emoji-mart/data')

    const emojiPicker = new Picker({
      data: Object.assign({}, data),
      theme: 'light',
      autoFocus: true,
      i18n: i18n,
      onEmojiSelect: (emoji: { native: string }) => {
        props.command?.(emoji.native)
      },
    })

    container.value?.appendChild(emojiPicker as unknown as Node)
  } catch (error) {
    if (error instanceof Error) {
      Toast.error('加载 Emoji 面板失败：' + error.message)
    }
  } finally {
    isLoading.value = false
  }
}

useEventListener(document, 'keydown', (event) => {
  if (event.key === 'Escape') {
    container.value?.remove()
    props.editor.chain().focus().run()
  }
})

onMounted(init)
</script>
<template>
  <div ref="container">
    <VLoading v-if="isLoading" />
  </div>
</template>
