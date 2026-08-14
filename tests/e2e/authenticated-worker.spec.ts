import { expect, test, type APIRequest, type APIRequestContext } from '@playwright/test'

const secret = 'weekflow-local-e2e-auth-secret-2026'
const userA = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'owner-a@weekflow.test',
  name: 'Owner A',
  role: 'user' as const
}
const userB = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'owner-b@weekflow.test',
  name: 'Owner B',
  role: 'user' as const
}
const admin = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'admin@weekflow.test',
  name: 'Admin',
  role: 'admin' as const
}

async function authenticate(request: APIRequestContext, user: typeof userA | typeof userB | typeof admin) {
  const response = await request.post('/api/__test__/session', {
    headers: { 'x-weekflow-test-auth': secret },
    data: user
  })
  expect(response.ok()).toBeTruthy()
  const cookie = response.headers()['set-cookie']?.split(';')[0]
  expect(cookie).toBeTruthy()
  return cookie!
}

async function authenticatedContext(requestFactory: APIRequest, user: typeof userA | typeof userB | typeof admin) {
  const bootstrap = await requestFactory.newContext({ baseURL: 'http://127.0.0.1:4174' })
  const cookie = await authenticate(bootstrap, user)
  await bootstrap.dispose()
  return requestFactory.newContext({
    baseURL: 'http://127.0.0.1:4174',
    extraHTTPHeaders: { cookie }
  })
}

test('redirects an anonymous browser and restores an authenticated session', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)

  const cookie = await authenticate(page.request, userA)
  const separator = cookie.indexOf('=')
  await page.context().addCookies([
    {
      name: cookie.slice(0, separator),
      value: cookie.slice(separator + 1),
      url: 'http://127.0.0.1:4174'
    }
  ])
  await page.goto('/')
  await expect(page).not.toHaveURL(/\/login/)
})

test('runs CRUD against migrated D1 and enforces ownership plus role boundaries', async ({ playwright }) => {
  const ownerContext = await authenticatedContext(playwright.request, userA)
  const strangerContext = await authenticatedContext(playwright.request, userB)
  const adminContext = await authenticatedContext(playwright.request, admin)

  const createdResponse = await ownerContext.post('/api/tasks', {
    data: { title: 'Private E2E task', week: '2026-W33' }
  })
  expect(createdResponse.status()).toBe(200)
  const created = (await createdResponse.json()) as { id: string; title: string }

  const ownerList = await ownerContext.get('/api/tasks?week=2026-W33')
  expect((await ownerList.json()) as Array<{ id: string }>).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: created.id })])
  )

  const strangerList = await strangerContext.get('/api/tasks?week=2026-W33')
  expect((await strangerList.json()) as Array<{ id: string }>).toEqual([])
  const leakedPatch = await strangerContext.patch(`/api/tasks/${created.id}`, { data: { title: 'Leak' } })
  expect([403, 404]).toContain(leakedPatch.status())

  expect((await ownerContext.patch(`/api/tasks/${created.id}`, { data: { status: 'done' } })).status()).toBe(200)
  expect((await strangerContext.get('/api/admin/users')).status()).toBe(403)
  expect((await adminContext.get('/api/admin/users')).status()).toBe(200)
  expect((await ownerContext.delete(`/api/tasks/${created.id}`)).status()).toBe(200)

  await ownerContext.dispose()
  await strangerContext.dispose()
  await adminContext.dispose()
})
