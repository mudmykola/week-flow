import { validateCloudflareApiToken } from './cloudflare-token.mjs'

const red = '\x1b[31m'
const green = '\x1b[32m'
const reset = '\x1b[0m'
const result = validateCloudflareApiToken(process.env.CLOUDFLARE_API_TOKEN)

if (!result.valid) {
  console.error(`${red}✗ CLOUDFLARE_API_TOKEN має невалідний формат (${result.reason}).${reset}`)
  console.error('Скопіюйте лише значення API token без пробілів, переносів рядків або тексту сторінки.')
  console.error('Значення секрету навмисно не виводиться.')
  process.exit(1)
}

console.log(`${green}✓ Формат CLOUDFLARE_API_TOKEN валідний; значення приховано.${reset}`)
