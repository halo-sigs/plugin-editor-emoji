import { definePlugin } from '@halo-dev/ui-shared'

export default definePlugin({
  extensionPoints: {
    'default:editor:extension:create': async () => {
      const { ExtensionEmoji } = await import('./editor')
      return [ExtensionEmoji]
    },
  },
})
