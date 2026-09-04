export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, ready, fetch } = useUserSession()
  if (!ready.value) await fetch()

  const publicRoutes = ['/login', '/about']
  if (!loggedIn.value && !publicRoutes.includes(to.path)) return navigateTo('/login')
  if (loggedIn.value && to.path === '/login') return navigateTo('/')
})
