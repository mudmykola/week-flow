# WeekFlow UI components

UI будується шарами й не дублює стилі контролів у feature-компонентах.

## Структура

- `components/base` — кнопки та icon actions.
- `components/form` — field, input, select, textarea й checkbox.
- `components/layout` — surface/card containers.
- `components/overlay` — modal, drawer і dropdown menu.
- `components/analytics`, `common`, `project`, `shell`, `task`, `week` — domain і composition components.
- Великі workspace розміщуються у власній feature-папці (`components/workflow`, `components/review`, `components/today`). Route-файл лишається тонкою точкою входу та не містить бізнес-логіки.

## Правила

1. На сторінках не створювати власний border/radius/focus для стандартних form controls.
2. Використовувати `FormField` для label, hint та error; control передавати через slot.
3. Для дій використовувати `BaseAppButton` або `BaseIconButton`.
4. Для карток використовувати `LayoutAppSurface`; feature-класи потрібні лише для унікальної поведінки.
5. Modal/drawer/dropdown мають використовувати overlay primitives, щоб зберігати однаковий backdrop, focus style та layering.
6. Якщо route або workspace перевищує приблизно 500–700 рядків, винести незалежні панелі в компоненти з явними `props`/`emits`, а спільні контракти — у `domain/entities`.
7. CSS-декларації зберігати в `assets/css/components/<feature>` або `assets/css/pages`; Vue SFC підключає свій файл через `<style scoped src="...">`. Workspace може підключити BEM-ізольований файл без `scoped`, якщо він стилізує винесені дочірні панелі. Inline style-блоки не використовувати.
8. Route не читає API й не тримає UI-стан: він монтує один workspace. Workspace оркеструє дані, а незалежні filters, metrics, panels, forms і dialogs мають власні компоненти.

Глобальні розміри, border, radius, shadow і focus ring визначені tokens у `app/presentation/assets/css/main.css`.
Nuxt використовує `pathPrefix: false`, тому назва глобального компонента дорівнює basename файла: `form/FormInput.vue` → `<FormInput>`, `base/AppButton.vue` → `<AppButton>`.

## BEM naming

BEM-класи є стабільним семантичним API для компонентів, тестів і точкових style overrides. Tailwind utility-класи залишаються відповідальними за візуальну реалізацію.

- Block компонента походить від basename файла: `TaskEditor.vue` → `task-editor`.
- Block сторінки походить від route: `/calendar` → `calendar-page`, `/invite/[token]` → `invite-token-page`, `/` → `week-board-page`.
- Кожен Vue template мусить мати свій block на кореневому UI-вузлі.
- Семантичні дочірні вузли використовують `block__element`: `app-drawer__header`.
- Стани й варіанти використовують `block--modifier`: `app-button--primary`.
- Utility-клас не замінюється BEM-класом і не використовується як назва element/modifier.
- Не створювати вкладені block-назви на кшталт `page__card__title`; використовувати `page__card-title` або окремий component block.

Автоматичний тест `tests/components/bem.test.ts` перевіряє block-клас у кожному компоненті та на кожній сторінці.
