# WeekFlow

WeekFlow — персональний і командний планувальник, побудований навколо тижневого робочого циклу. Застосунок поєднує Kanban-дошку, календар, аналітику, повторювані задачі та спільні проєкти в одному швидкому інтерфейсі.

**Production:** [weekflow.pp.ua](https://weekflow.pp.ua)

## Можливості

- Google OAuth, окремі дані користувачів і ролі `user`, `pm`, `admin`.
- Тижнева дошка з drag-and-drop, компактним режимом, WIP-сигналами та швидким перенесенням задач.
- Пріоритети, дедлайни, теги, повторення, підзадачі та коментарі.
- Представлення «Сьогодні», «Майбутні», «Прострочені», календар і таймлайн.
- Dashboard із KPI та легкими графіками, тижневий огляд, персональна дошка датованих checklist-стікерів, активність та архів.
- Focus-таймер, Inbox для швидкого захоплення задач і персональні шаблони.
- Спільні проєкти із запрошеннями та ролями `editor` і `viewer`.
- Збережені фільтри, глобальний пошук `⌘/Ctrl + K`, JSON/CSV-експорт.
- Адаптивний інтерфейс, світла й темна теми, Lucide-іконки та installable PWA.
- Адміністративне керування ролями й доступом до акаунтів.
- PM-команди: учасники, персональні й командні цілі, task progress та загальний dashboard.
- Гнучка робота із задачами: drawer деталей, inline editing, виконавці, масові операції, дублювання, undo та табличний вигляд.
- Проєктні workflow-етапи з WIP-лімітами й автоматизації для створення задач і зміни статусів.

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
- Zod, date-fns, VueUse, Nuxt A11y, Nuxt Hints та Vite PWA.
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

UI primitives розділені на `base`, `form`, `layout` і `overlay`; правила повторного використання описані в [`docs/ui-components.md`](docs/ui-components.md).
Сторінки використовують directory-first Nuxt routing (`<route>/index.vue`, `[param]/index.vue`); конвенції описані в [`docs/page-routing.md`](docs/page-routing.md).

UI-тексти локалізуються через Nuxt i18n; правила та структура словників описані в [`docs/localization.md`](docs/localization.md).

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

Production callback:

```text
https://weekflow.pp.ua/auth/google
```

Якщо Nuxt стартував на іншому порту, наприклад `3210`, додайте також `http://localhost:3210/auth/google`. Після зміни `.env` повністю перезапустіть dev-сервер.

> `.env`, локальна D1 і файли credentials ігноруються Git. У репозиторій можна додавати лише `.env.example` без реальних значень.

## Перевірка та збірка

Перед `git add .` завжди запускайте єдиний локальний quality gate:

```bash
pnpm ready
git add .
git commit -m "..."
```

Перед push у `main` виконується remote release gate. Він повторює локальні перевірки, перевіряє реальний доступ до production D1 та збирає Worker у `--dry-run` режимі:

```bash
pnpm cf:login
pnpm release:gate
git push
```

Git hook `pre-push` запускає `pnpm release:gate` автоматично та блокує push, якщо Cloudflare-сесія протермінована, токен не має доступу до D1 або Worker не проходить dry-run.

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
