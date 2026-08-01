# WeekFlow page routing

WeekFlow follows Nuxt 4 file-based routing with a directory-first page structure.

```text
presentation/pages/
├── index.vue                  # /
├── analytics/
│   └── index.vue              # /analytics
├── projects/
│   ├── index.vue              # /projects
│   └── [slug]/
│       └── index.vue          # /projects/:slug
└── invite/
    └── [token]/
        └── index.vue          # /invite/:token
```

Правила:

1. Кореневий маршрут зберігається у `pages/index.vue`.
2. Кожен статичний маршрут має папку `<route>/index.vue`.
3. Dynamic params мають змістовні назви: `[token]`, `[id]`, `[slug]`.
4. Сегмент `[slug]` використовується лише для людиночитних URL; security token не перейменовується на slug.
5. Перенесення сторінки не повинно змінювати її публічний URL або navigation contract.

Джерело: [Nuxt 4 pages documentation](https://nuxt.com/docs/4.x/directory-structure/app/pages).
