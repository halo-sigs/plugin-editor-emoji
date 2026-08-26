import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const emojiMartRoot = resolve(projectRoot, 'node_modules/@emoji-mart/data')
const outputPath = resolve(projectRoot, 'src/editor/emoji-data.generated.json')

const [source, locale] = await Promise.all([
  readFile(resolve(emojiMartRoot, 'sets/15/native.json'), 'utf8').then(JSON.parse),
  readFile(resolve(emojiMartRoot, 'i18n/zh.json'), 'utf8').then(JSON.parse),
])

const emojiIds = Object.keys(source.emojis)
const emojiIndexes = new Map(emojiIds.map((id, index) => [id, index]))
const aliasesByEmoji = new Map()

for (const [alias, emojiId] of Object.entries(source.aliases)) {
  const aliases = aliasesByEmoji.get(emojiId) ?? []
  aliases.push(alias)
  aliasesByEmoji.set(emojiId, aliases)
}

const emojis = emojiIds.map((id) => {
  const emoji = source.emojis[id]

  return [
    id,
    emoji.skins[0].native,
    aliasesByEmoji.get(id) ?? 0,
    emoji.keywords?.length ? emoji.keywords : 0,
    emoji.version ?? 0,
    emoji.emoticons?.length ? emoji.emoticons : 0,
  ]
})

const categories = source.categories.map((category) => [
  category.id,
  locale.categories[category.id] ?? category.id,
  category.emojis.map((emojiId) => emojiIndexes.get(emojiId)),
])

const output = `${JSON.stringify({ e: emojis, c: categories })}\n`

await mkdir(dirname(outputPath), { recursive: true })

let currentOutput
try {
  currentOutput = await readFile(outputPath, 'utf8')
} catch {
  currentOutput = undefined
}

if (currentOutput !== output) {
  await writeFile(outputPath, output)
}
