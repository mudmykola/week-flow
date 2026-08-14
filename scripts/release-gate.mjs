import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { validateCloudflareApiToken } from './cloudflare-token.mjs'

const green = '\x1b[32m'
const red = '\x1b[31m'
const orange = '\x1b[38;5;208m'
const reset = '\x1b[0m'
const config = readFileSync('wrangler.toml', 'utf8')

function run(label, binary, args) {
  console.log(`\n${orange}▶ ${label}${reset}`)
  const result = spawnSync(binary, args, { encoding: 'utf8', stdio: 'pipe' })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    console.error(`\n${red}✗ ${label} не пройдено.${reset}`)
    console.error(`${red}Push заблоковано: deployment впаде з цією Cloudflare-сесією або токеном.${reset}`)
    console.error('Виконайте `pnpm cf:login`, потім повторіть `pnpm release:gate`.')
    process.exit(result.status || 1)
  }
  console.log(`${green}✓ ${label} пройдено${reset}`)
}

if (!/^account_id = "657ef9c8a4d956832aa095cb76db5fc0"$/m.test(config)) {
  console.error(`${red}✗ У wrangler.toml відсутній канонічний Cloudflare account_id.${reset}`)
  process.exit(1)
}

console.log(`${orange}╭────────────────────────────────────────────╮${reset}`)
console.log(`${orange}│      WeekFlow · Remote Release Gate        │${reset}`)
console.log(`${orange}╰────────────────────────────────────────────╯${reset}`)

if (process.env.CLOUDFLARE_API_TOKEN) {
  const tokenResult = validateCloudflareApiToken(process.env.CLOUDFLARE_API_TOKEN)
  if (!tokenResult.valid) {
    console.error(`${red}✗ CLOUDFLARE_API_TOKEN має невалідний формат (${tokenResult.reason}).${reset}`)
    console.error('Push заблоковано до звернення до Cloudflare; значення секрету не виводиться.')
    process.exit(1)
  }
  console.log(`${green}✓ Формат CLOUDFLARE_API_TOKEN валідний; значення приховано.${reset}`)
}

run('Локальний quality gate', 'pnpm', ['quality:gate'])
run('Authenticated Worker E2E', 'pnpm', ['test:e2e'])
run('Доступ до production D1', 'pnpm', [
  'exec',
  'wrangler',
  'd1',
  'migrations',
  'list',
  'weekflow-db',
  '--remote',
  '--config',
  'wrangler.toml'
])
run('Cloudflare deploy dry-run', 'pnpm', ['exec', 'wrangler', 'deploy', '--dry-run'])

console.log(`\n${green}✓ Remote credentials, migrations і Worker bundle готові до push/deploy.${reset}\n`)
