# WeekFlow

WeekFlow — персональний і командний workspace для планування навколо тижневого робочого циклу. Він поєднує задачі, календар, процеси, цілі, щоденні нотатки та командне керування в одному адаптивному PWA.

**Production:** [weekflow.pp.ua](https://weekflow.pp.ua)

## Можливості

- Google OAuth, окремі дані користувачів і ролі `user`, `pm`, `admin`.
- Тижнева дошка з drag-and-drop, компактним режимом, WIP-сигналами та швидким перенесенням задач.
- Пріоритети, дедлайни, теги, повторення, підзадачі та коментарі.
- Представлення «Сьогодні», «Майбутні», «Прострочені», календар і таймлайн.
- Інтерактивна аналітика з KPI, трендами, фільтрами й переходами від графіка до відповідних задач.
- Інтерактивний календар із місячним та agenda-представленнями, фільтрами й оцінкою навантаження.
- Тижневий огляд, персональна дошка датованих checklist-стікерів, журнал активності та архів.
- Focus-таймер, Inbox для швидкого захоплення задач і персональні шаблони.
- Спільні проєкти із запрошеннями та ролями `editor` і `viewer`.
- Збережені фільтри, глобальний пошук `⌘/Ctrl + K`, JSON/CSV-експорт.
- Адаптивний інтерфейс, світла й темна теми, Lucide-іконки та installable PWA.
- Admin Control Center із системними метриками, пошуком, bulk actions, аудитом, керуванням ролями, доступом і PM-командами.
- PM-команди: учасники, персональні й командні цілі, task progress та загальний dashboard.
- Гнучка робота із задачами: drawer деталей, inline editing, виконавці, масові операції, дублювання, undo та табличний вигляд.
- Візуальний workflow builder: перевпорядкування етапів, WIP-ліміти та керовані автоматизації для створення задач і зміни статусів.

## Ролі та доступ

- `user` — власні задачі, проєкти та призначені цілі.
- `pm` — можливості користувача, власна команда, її задачі, цілі та прогрес учасників.
- `admin` — керування системними ролями, блокуванням акаунтів і повний доступ до всіх PM-команд, учасників та цілей.

Після зміни ролі користувачу потрібно повторно ввійти, щоб оновити роль у захищеній сесії.

## Технології

- Nuxt 4, Vue 3, TypeScript і Pinia.
- Nuxt UI, Tailwind CSS 4, Nuxt Icon, Nuxt Color Mode та Nuxt Image.
- Nitro API на Cloudflare Workers.
- Cloudflare D1 і Drizzle ORM.
- Unovis, Zod, date-fns, VueUse, Nuxt A11y, Nuxt Hints та Vite PWA.
- pnpm і Wrangler.

## Архітектура

Клієнтська частина використовує шарову архітектуру:

```text
app/presentation/  сторінки та Vue-компоненти
      ↓
app/application/   Pinia stores, composables і сценарії використання
      ↓
app/domain/        сутності та чисті бізнес-правила
      ↓
app/data/          репозиторії й типізовані запити до Nitro API
```

Компоненти працюють зі станом через application layer, а мережеві запити зосереджені в data layer. Серверні маршрути розташовані в `server/api/`, авторизація та правила доступу — у `server/utils/`, схема бази — у `server/db/schema.ts`, а SQL-міграції — у `server/db/migrations/`.

UI primitives розділені на `base`, `form`, `layout` і `overlay`; правила повторного використання описані в [`docs/ui-components.md`](docs/ui-components.md).
Сторінки використовують directory-first Nuxt routing (`<route>/index.vue`, `[param]/index.vue`); конвенції описані в [`docs/page-routing.md`](docs/page-routing.md).

UI-тексти локалізуються через Nuxt i18n; правила та структура словників описані в [`docs/localization.md`](docs/localization.md).

## Вимоги й локальний запуск

Потрібні Node.js 24, pnpm 10, Cloudflare Wrangler і Google OAuth Web credentials.

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

У Google Cloud Console додайте точний локальний callback:

```text
http://localhost:3000/auth/google
```

Production callback:

```text
https://weekflow.pp.ua/auth/google
```

Команда `pnpm dev` використовує тільки порт `3000`. Якщо він зайнятий, перевірка зупинить запуск із чітким повідомленням замість тихого переходу на порт, якого немає у Google OAuth credentials. Звільніть порт `3000` і запустіть сервер повторно.

> `.env`, локальна D1 і файли credentials ігноруються Git. У репозиторій можна додавати лише `.env.example` без реальних значень.

## Перевірка та збірка

Для швидкої перевірки перед `git add .` запускайте локальний quality gate:

```bash
pnpm quality:gate
git add .
git commit -m "..."
```

Перед push у `main` команда `pnpm ready` запускає повний remote release gate. Вона повторює локальні перевірки, перевіряє реальний доступ до production D1 та збирає Worker у `--dry-run` режимі:

```bash
pnpm cf:login
pnpm ready
git push
```

Git hook `pre-push` запускає `pnpm release:gate` автоматично та блокує push, якщо Cloudflare-сесія протермінована, токен не має доступу до D1 або Worker не проходить dry-run.

CI окремо перевіряє формат `CLOUDFLARE_API_TOKEN` до першого виклику Wrangler. У GitHub Secret потрібно вставляти лише саме значення token: без пробілів, переносів рядків, команди `curl` чи тексту зі сторінки Cloudflare. Значення секрету під час перевірки ніколи не виводиться.

Якщо workflow повідомляє `invalid header value`, перевипустіть token у Cloudflare, скопіюйте тільки рядок token і повторно збережіть `CLOUDFLARE_API_TOKEN` у GitHub Actions Secrets. Локально формат env-token можна перевірити без мережевого запиту:

```bash
pnpm cloudflare:token:check
```

Gate виводить branch, версії runtime, кількість staged/unstaged/untracked файлів і безпечний стан потрібних env-змінних без значень секретів. Далі він послідовно перевіряє форматування, TypeScript, тести з coverage та Cloudflare production build.

Pre-commit hook автоматично повторює `pnpm quality:gate` і блокує commit при будь-якій помилці. GitHub Actions використовує ту саму команду перед deploy, тому локальна та CI-перевірки не розходяться.

```bash
pnpm typecheck
pnpm format:check
pnpm test
pnpm test:coverage
pnpm build
```

Тести на Vitest покривають domain services, Zod-валідатори, API repositories, Pinia stores та ключові взаємодії Vue-компонентів. Coverage gate вимагає щонайменше 85% для lines/functions/statements і 75% для branches; GitHub Actions виконує його перед production build та deploy.

Для розробки доступний watch-режим:

```bash
pnpm test:watch
```

Для автоматичного форматування Vue, TypeScript, CSS, Markdown та конфігурацій:

```bash
pnpm format
```

## База даних і міграції D1

Після зміни `server/db/schema.ts`:

```bash
pnpm db:generate
pnpm db:migrate:local
```

Локальну міграцію потрібно застосувати й перевірити до commit. Після push у `main` production workflow:

1. перевіряє список remote migrations;
2. зберігає D1 Time Travel recovery bookmark і metadata релізу на 30 днів;
3. застосовує pending migrations до production D1;
4. лише після цього публікує Worker та виконує smoke checks.

Ручну production-міграцію використовуйте лише для контрольованих операцій поза CI:

```bash
pnpm db:migrate:remote
```

## Deployment

Production secrets OAuth і session налаштовуються безпосередньо у Cloudflare Worker. Для контрольованого ручного deploy доступна команда:

```bash
pnpm deploy
```

Конфігурація Worker і D1 binding зберігається у `wrangler.toml`. Production-секрети Cloudflare не копіюються до локального `.env`.

Push у гілку `main` автоматично запускає GitHub Actions workflow: frozen install, повний quality gate, перевірку Cloudflare credentials, recovery metadata, D1 migrations, Worker deploy, перевірку сайту та D1-aware API health check. Workflow також можна запустити вручну через **Actions → Deploy production → Run workflow**.

Для CI/CD у GitHub мають бути налаштовані repository secrets:

```text
CLOUDFLARE_API_TOKEN
```

`account_id`, Worker route і D1 binding зберігаються у `wrangler.toml`; дублювати account ID у GitHub Secrets не потрібно.

## Спостережуваність

- `GET /api/health` перевіряє доступність Worker і production D1 та повертає `requestId` для діагностики.
- API й OAuth-виклики отримують `x-request-id`; безпечний ID від клієнта зберігається, некоректний замінюється.
- Структуровані JSON-логи містять метод, шлях без query-параметрів, HTTP-статус і тривалість запиту.
- Cloudflare Workers Logs та invocation logs увімкнені у `wrangler.toml`.
- Після deploy CI перевіряє і канонічну сторінку, і `/api/health` з реальним D1-запитом.

## Структура проєкту

```text
app/presentation/       Nuxt pages, layouts і reusable UI
app/application/        composables, Pinia stores і use cases
app/domain/             сутності та чисті бізнес-правила
app/data/               HTTP client і API repositories
server/api/             Nitro API routes
server/middleware/      request observability
server/utils/           authorization, validation і server helpers
server/db/              D1 schema, migrations і seed
tests/                  domain, data, server і component coverage
docs/                   архітектурні конвенції та upgrade roadmap
updates/                журнал реалізованих змін
.github/workflows/      production delivery pipeline
nuxt.config.ts          Nuxt modules, i18n, UI, icons і PWA
wrangler.toml           Cloudflare Worker, observability та D1 bindings
```

## Документація

- [UI components](docs/ui-components.md) — структура primitives і правила повторного використання.
- [Page routing](docs/page-routing.md) — directory-first Nuxt routing.
- [Localization](docs/localization.md) — правила i18n та словників.
- [Upgrade roadmap](docs/upgrade-roadmap-2026-08.md) — технічний аудит і послідовність розвитку.
- [Dev Log](updates/2026-08-01.md) — реалізовані зміни, issue references та перевірки.

## Безпека

- Не комітьте `.env`, `.dev.vars`, OAuth JSON або приватні ключі.
- Використовуйте різні session passwords для local і production.
- Перед публікацією перевіряйте staged-файли командою `git diff --cached --name-only`.
- Якщо секрет випадково потрапив у Git, негайно відкличте його; одного видалення з нового commit недостатньо.
