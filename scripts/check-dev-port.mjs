import { createServer } from 'node:net'

const port = 3000
const host = 'localhost'
const server = createServer()

server.once('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nWeekFlow cannot start: http://${host}:${port} is already in use.`)
    console.error(`Google OAuth requires the exact callback http://${host}:${port}/auth/google.`)
    console.error('Stop the process using port 3000, then run pnpm dev again.\n')
    process.exit(1)
  }
  console.error(`\nWeekFlow could not verify the required OAuth port ${port}: ${error.message}\n`)
  process.exit(1)
})

server.listen({ port, host, exclusive: true }, () => server.close())
