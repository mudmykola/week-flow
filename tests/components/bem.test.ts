import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const presentationRoot = path.resolve('app/presentation')

function vueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return vueFiles(target)
    return entry.name.endsWith('.vue') ? [target] : []
  })
}

function kebab(value: string) {
  return value
    .replace(/\.vue$/, '')
    .replace(/\[|\]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
}

function expectedBlock(file: string) {
  const relative = path.relative(presentationRoot, file)
  if (!relative.startsWith('pages/')) return kebab(path.basename(file))
  if (relative === 'pages/index.vue') return 'week-board-page'
  return `${kebab(
    relative
      .replace(/^pages\//, '')
      .replace('/index.vue', '')
      .replace('.vue', '')
      .replaceAll('/', '-')
  )}-page`
}

function rootOpeningTag(source: string) {
  const template = source.slice(source.indexOf('<template>') + '<template>'.length)
  const firstTag = template.match(/<[A-Za-z][\s\S]*?>/)?.[0] ?? ''
  if (!firstTag.startsWith('<Teleport')) return firstTag
  return template.slice(template.indexOf('>', template.indexOf('<Teleport')) + 1).match(/<[A-Za-z][\s\S]*?>/)?.[0] ?? ''
}

describe('BEM presentation contract', () => {
  const files = vueFiles(presentationRoot)

  it('assigns a route or component block to every Vue template', () => {
    expect(files).toHaveLength(48)
    for (const file of files) {
      const opening = rootOpeningTag(readFileSync(file, 'utf8'))
      const classes = opening.match(/\bclass="([^"]*)"/)?.[1]?.split(/\s+/) ?? []
      expect(classes, path.relative(presentationRoot, file)).toContain(expectedBlock(file))
    }
  })

  it('does not duplicate static class tokens', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/(?<!:)\bclass="([^"]*)"/g)) {
        const classes = match[1]!.split(/\s+/).filter(Boolean)
        expect(new Set(classes).size, path.relative(presentationRoot, file)).toBe(classes.length)
      }
    }
  })
})
