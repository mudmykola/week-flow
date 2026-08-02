import { verifyProductionHealth } from './production-health.mjs'

const green = '\x1b[32m'
const red = '\x1b[31m'
const orange = '\x1b[38;5;208m'
const reset = '\x1b[0m'
const url = process.env.WEEKFLOW_HEALTH_URL ?? 'https://weekflow.pp.ua/api/health'
const requestId = `deploy-${process.env.GITHUB_RUN_ID ?? 'local'}`

console.log(`${orange}▶ Waiting for the production API and D1 health contract${reset}`)

try {
  const payload = await verifyProductionHealth({
    url,
    requestId,
    onRetry: ({ attempt, attempts, reason }) => {
      console.log(`${orange}  ${attempt}/${attempts} not ready: ${reason}; retrying…${reset}`)
    }
  })
  console.log(`${green}✓ Production API and D1 are healthy (${payload.requestId ?? requestId})${reset}`)
} catch (error) {
  console.error(`${red}✗ ${error instanceof Error ? error.message : 'Production health check failed'}${reset}`)
  process.exitCode = 1
}
