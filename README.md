# WeekFlow

WeekFlow — персональний і командний планувальник, побудований навколо тижневого робочого циклу. Застосунок поєднує Kanban-дошку, календар, аналітику, повторювані задачі та спільні проєкти в одному швидкому інтерфейсі.

**Production:** [weekflow.freelance-mud.workers.dev](https://weekflow.freelance-mud.workers.dev)

## Можливості

- Google OAuth, окремі дані кожного користувача та роль адміністратора.
- Тижнева дошка з drag-and-drop і швидким перенесенням незавершених задач.
- Пріоритети, дедлайни, теги, повторення, підзадачі та коментарі.
- Представлення «Сьогодні», «Майбутні», «Прострочені», календар і таймлайн.
- Аналітика продуктивності, тижневий огляд, граф зв’язків, активність та архів.
- Спільні проєкти із запрошеннями та ролями `editor` і `viewer`.
- Збережені фільтри, глобальний пошук `⌘/Ctrl + K`, JSON/CSV-експорт.
- Адаптивний інтерфейс, світла й темна теми, Lucide-іконки та installable PWA.
- Адміністративне керування ролями й доступом до акаунтів.

## Технології

- Nuxt 4, Vue 3, TypeScript і Pinia.
- Nuxt UI, Tailwind CSS 4, Nuxt Icon, Nuxt Color Mode та Nuxt Image.
- Nitro API на Cloudflare Workers.
- Cloudflare D1 і Drizzle ORM.
- Zod, date-fns, VueUse та Vite PWA.
- pnpm і Wrangler.

## Архітектура

Клієнтська частина в `app/` розділена на чотири шари:

```text
presentation/  сторінки та Vue-компоненти
      ↓
application/   Pinia stores, composables і сценарії використання
      ↓
domain/        сутності та чисті бізнес-правила
      ↓
data/          репозиторії й запити до Nitro API
```

Компоненти працюють зі станом через application layer, а мережеві запити зосереджені в data layer. Серверні маршрути розташовані в `server/api/`, схема бази — у `server/db/schema.ts`, а SQL-міграції — у `server/db/migrations/`.

## Локальний запуск

Потрібні Node.js, pnpm і Google OAuth Web credentials.

```bash
pnpm install
cp .env.example .env
pnpm db:migrate:local
pnpm dev
```

Заповніть локальний `.env`:

```dotenv
NUXT_OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
NUXT_SESSION_PASSWORD=unique-random-value-with-at-least-32-characters
```

У Google Cloud Console додайте точний callback відповідно до локального порту:

```text
http://localhost:3000/auth/google
```

Якщо Nuxt стартував на іншому порту, наприклад `3210`, додайте також `http://localhost:3210/auth/google`. Після зміни `.env` повністю перезапустіть dev-сервер.

> `.env`, локальна D1 і файли credentials ігноруються Git. У репозиторій можна додавати лише `.env.example` без реальних значень.

## Перевірка та збірка

```bash
pnpm typecheck
pnpm build
```

## Міграції D1

Після зміни `server/db/schema.ts`:

```bash
pnpm db:generate
pnpm db:migrate:local
pnpm db:migrate:remote
```

Міграції не запускаються автоматично під час deploy і мають застосовуватися окремо для кожного середовища.

## Deployment

Production secrets налаштовуються у Cloudflare Worker, після чого застосунок публікується командою:

```bash
pnpm deploy
```

Конфігурація Worker і D1 binding зберігається у `wrangler.toml`. Production-секрети Cloudflare не копіюються до локального `.env`.

Push у гілку `main` автоматично запускає GitHub Actions workflow: встановлення залежностей, typecheck, production build, deploy Worker і перевірку production endpoint. Workflow також можна запустити вручну через **Actions → Deploy production → Run workflow**. D1 migrations залишаються окремим контрольованим кроком і мають застосовуватися командою `pnpm db:migrate:remote` перед push, який використовує нову схему.

Для CI/CD у GitHub мають бути налаштовані repository secrets:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

## Структура проєкту

```text
app/                    клієнтський застосунок
server/api/             Nitro API
server/db/              D1 schema, migrations і seed
updates/                журнал змін
nuxt.config.ts          Nuxt, UI, icons і PWA
wrangler.toml           Cloudflare Worker та D1 bindings
```

## Безпека

- Не комітьте `.env`, `.dev.vars`, OAuth JSON або приватні ключі.
- Використовуйте різні session passwords для local і production.
- Перед публікацією перевіряйте staged-файли командою `git diff --cached --name-only`.
- Якщо секрет випадково потрапив у Git, негайно відкличте його; одного видалення з нового commit недостатньо.
