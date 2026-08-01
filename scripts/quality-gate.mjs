import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const color = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  orange: '\x1b[38;5;208m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
}

function command(binary, args, options = {}) {
  const result = spawnSync(binary, args, { encoding: 'utf8', ...options })
  return result
}

function value(binary, args) {
  return command(binary, args).stdout?.trim() || 'невідомо'
}

function line(label, output) {
  console.log(`  ${color.dim}${label.padEnd(18)}${color.reset}${output}`)
}

function section(title) {
  console.log(`\n${color.bold}${color.cyan}◆ ${title}${color.reset}`)
}

const branch = value('git', ['branch', '--show-current']) || 'detached HEAD'
const statusLines = value('git', ['status', '--short']).split('\n').filter(Boolean)
const staged = statusLines.filter((item) => item[0] !== ' ' && item[0] !== '?').length
const unstaged = statusLines.filter((item) => item[1] && item[1] !== ' ').length
const untracked = statusLines.filter((item) => item.startsWith('??')).length

console.log(`${color.bold}${color.orange}╭────────────────────────────────────────────╮${color.reset}`)
console.log(`${color.bold}${color.orange}│       WeekFlow · Local Quality Gate        │${color.reset}`)
console.log(`${color.bold}${color.orange}╰────────────────────────────────────────────╯${color.reset}`)

section('Контекст')
line('Branch', branch)
line('Node', process.version)
line('pnpm', value('pnpm', ['--version']))
line('Змінено файлів', String(statusLines.length))
line('Staged', String(staged))
line('Unstaged', String(unstaged))
line('Untracked', String(untracked))

section('Локальне середовище')
const requiredEnv = ['NUXT_OAUTH_GOOGLE_CLIENT_ID', 'NUXT_OAUTH_GOOGLE_CLIENT_SECRET', 'NUXT_SESSION_PASSWORD']
if (!existsSync('.env')) {
  line('.env', `${color.yellow}відсутній — допустимо для CI, local OAuth не працюватиме${color.reset}`)
} else {
  const envText = readFileSync('.env', 'utf8')
  for (const key of requiredEnv) {
    const configured = new RegExp(`^${key}=.+$`, 'm').test(envText)
    line(key, configured ? `${color.green}налаштовано${color.reset}` : `${color.yellow}не задано${color.reset}`)
  }
}

const checks = [
  ['Форматування', ['format:check']],
  ['TypeScript', ['typecheck']],
  ['Тести + coverage', ['test:coverage']],
  ['Production build', ['build']]
]

section('Перевірки')
const gateStarted = Date.now()
for (const [name, args] of checks) {
  const started = Date.now()
  console.log(`\n${color.bold}${color.orange}▶ ${name}${color.reset}`)
  const result = command('pnpm', args, { stdio: 'inherit' })
  const duration = ((Date.now() - started) / 1000).toFixed(1)
  if (result.status !== 0) {
    console.error(`\n${color.bold}${color.red}✗ ${name} не пройдено (${duration}s)${color.reset}`)
    console.error(
      `${color.red}Commit/merge/deploy заблоковано. Виправте помилку й повторіть pnpm quality:gate.${color.reset}`
    )
    process.exit(result.status || 1)
  }
  console.log(`${color.green}✓ ${name} пройдено (${duration}s)${color.reset}`)
}

const duration = ((Date.now() - gateStarted) / 1000).toFixed(1)
console.log(
  `\n${color.bold}${color.green}✓ WeekFlow готовий до git add, commit, merge та deploy (${duration}s)${color.reset}\n`
)
