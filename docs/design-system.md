# CineBook design system

The shared visual language for every CineBook page: public site, customer
account, booking flow and admin workspace. It is built on Tailwind CSS; there is
no separate component library.

| Layer | Where | What it holds |
| --- | --- | --- |
| Tokens (values) | `client/src/index.css` → `:root` | Colours, motion, layout values as CSS variables |
| Theme accents | `client/src/index.css` → `:root[data-color-theme=…]` | The five colour themes (only `brand`, `accent`, gradients) |
| Token names | `client/tailwind.config.js` | Maps variables to class names (`bg-surface`, `text-fg-muted`, …) |
| Component classes | `client/src/index.css` → `@layer components` | `.btn-*`, `.card`, `.input`, `.select`, `.segmented`, `.menu`, … |
| React components | `client/src/components/ui/` (barrel: `ui/index.js`) | Behaviour + markup: Button, Tabs, Modal, Drawer, inputs, … |
| Behaviour hooks | `client/src/lib/a11y.js`, `client/src/lib/motion.js` | Focus trap, scroll lock, dismiss, roving keys, motion constants |

Rule of thumb: **use a semantic token or component class; reach for a raw value
only when nothing fits, and then consider adding a token.**

---

## 1. Colour

### Surfaces (darkest → lightest)

| Token | Class | Use |
| --- | --- | --- |
| `--surface-canvas` | `bg-canvas` | Page background |
| `--surface-sunken` | `bg-surface-sunken` | Header bands, nav bars, inputs, wells |
| `--surface-raised` | `bg-surface` | Cards and panels |
| `--surface-overlay` | `bg-surface-overlay` | Menus, popovers, tooltips, toasts |
| `--surface-highlight` | `bg-surface-highlight` | Selected/hovered rows on overlays |

The primitive `ink-950…600` ramp is the same colours and remains available.

### Text roles

All roles are **≥ 4.5:1 on every surface** (WCAG AA for body text).

| Class | Role | Contrast on `surface` |
| --- | --- | --- |
| `text-fg` | Headings, key figures | 18.5:1 |
| `text-fg-body` | Paragraph text (body default) | 14.9:1 |
| `text-fg-secondary` | Supporting copy | 12.6:1 |
| `text-fg-muted` | Labels, metadata | 7.3:1 |
| `text-fg-subtle` | Captions, hints, counts | 5.5:1 |

`gray-500` was re-tuned from Tailwind's `#6B7280` (3.1–4.2:1 here, failing AA)
to `#848CA0` (4.5–6.0:1). Existing `text-gray-*` classes map to the roles above:
200 body · 300 secondary · 400 muted · 500 subtle. Avoid `gray-600/700` for
text; they are below 3:1.

### Lines and fills (fixed alpha over the dark surfaces)

| Class | Alpha | Use |
| --- | --- | --- |
| `border-line-subtle` | 5% | Nested dividers |
| `border-line` | 8% | Card borders, section dividers |
| `border-line-strong` | 14% | Control borders (buttons, inputs, chips) |
| `bg-fill-subtle` | 3% | Table header, row hover |
| `bg-fill` | 5% | Ghost hover, quiet buttons |
| `bg-fill-strong` | 8% | Secondary buttons, selected list items |
| `bg-fill-emphasis` | 12% | Selected segment, count pills |

These have no `/opacity` modifier; pick the step instead.

### Accents (themed)

`brand-200…700` and `accent-200…700` change with the colour theme. Use them for
interactive emphasis: links, active states, focus, selection.

- **`bg-brand-solid` + `text-on-brand`**: any solid accent fill that carries
  text or a number (selected seat, step badge, avatar, count badge). It is
  `brand-600` for Electric Blue and Royal Violet (where white on `brand-500` is
  only 3.4:1 / 4.2:1) and `brand-500` elsewhere. Always ≥ 4.5:1.
- `bg-brand-gradient`: primary buttons and active chips (≥ 4.7:1 in every theme).
- Don't use `bg-brand-500` behind text.

### Status (fixed, never themed)

| Meaning | Classes |
| --- | --- |
| Success | `success-200…700`, `.badge-success`, `.alert-success`, `.btn-success` |
| Warning | `warning-300…500` (`gold-*` is the old alias), `.badge-warning`, `.alert-warning` |
| Error / destructive | `danger-300…600`, `.badge-danger`, `.alert-error`, `.btn-danger`, `.btn-danger-solid` |
| Information | `info-200…500`, `.badge-info`, `.alert-info` |

Status colours never change with the theme, so "success" stays green even in the
Emerald theme and "warning" stays amber in the Amber theme. Pair colour with an
icon or a word; never rely on colour alone.

Seat states on the 2D map and in the 3D hall keep their own fixed palette
(`pages/Seats.jsx`, `components/cinema3d/`).

## 2. Typography

- Families: **Outfit** (`font-display`, all headings) and **Inter** (`font-sans`, everything else).
- Scale additions: `text-3xs` 10px (dense counters only), `text-2xs` 11px
  (overlines, badges), `text-md` 15px (touch menus), `text-display-sm/md/lg/xl`
  (28/36/48/60px with tightened tracking).

| Class | Use |
| --- | --- |
| `.text-display` | Hero headline (responsive display-md → display-xl) |
| `.page-title` | The single `h1` of a page (used by `PageHeader`) |
| `.section-title` | `h2` section headings |
| `.card-title` | Headings inside cards, dialogs, drawers |
| `.eyebrow` | Accent overline above a title |
| `.overline` | Neutral uppercase label |
| `.caption` | Hints and fine print |
| `.stat-value` | Dashboard figures (tabular numbers) |

## 3. Spacing and layout

- Spacing uses Tailwind's 4px scale. Common steps: 2 (8px) inside controls,
  4 (16px) between related items, 6–8 (24–32px) between groups, 12–16 between sections.
- Containers: `.container-page` (max 80rem, gutters 16/24/32px) and
  `.container-narrow` (max 48rem: forms, tickets, scanning).
- `.page`: vertical rhythm for a routed page (32/40/48px). `.section`: 48/64px
  between large sections.
- `h-header` / `top-header` / `min-h-screen-nav`: the 64px main navigation.

| Workspace | Shell |
| --- | --- |
| Public and customer pages | `<main id="main" className="container-page page page-enter">` + `PageHeader` |
| Sign-in screens | `AuthLayout` |
| Admin | `AdminLayout` (section bar + `container-page page`) + `PageHeader` with breadcrumbs |
| Booking (seats, 3D hall, checkout) | Full-bleed pages with their own sticky header; **no** `page-enter`, because the fixed booking bar must not move |

Every page's main region has `id="main"` (the target of the "Skip to content" link), including loading states.

## 4. Surfaces, radius, elevation

| Radius | Class | Use |
| --- | --- | --- |
| 8px | `rounded-lg` | Small items inside controls (segments, menu items) |
| 12px | `rounded-control` (= `rounded-xl`) | Buttons, inputs, chips' containers |
| 16px | `rounded-card` (= `rounded-2xl`) | Cards, panels, dialogs, menus |
| 24px | `rounded-panel` | Hero panels, bottom sheets |
| full | `rounded-full` | Pills, avatars, dots |

| Elevation | Class | Use |
| --- | --- | --- |
| Resting | `shadow-card` | Cards |
| Floating | `shadow-popover` | Menus, tooltips, toasts |
| Modal | `shadow-overlay` | Dialogs, drawers |
| Accent | `shadow-glow` | Primary call to action only |

Glass (`.glass`, `backdrop-blur-glass`) is reserved for bars and sheets that
sit over moving content (navigation, booking bar). Cards stay mostly opaque.

## 5. Motion

| Token | CSS | Tailwind | JS (`lib/motion.js`) | Use |
| --- | --- | --- | --- | --- |
| fast | `--duration-fast` 120ms | `duration-fast` | `DURATION.fast` | Hover, press, colour |
| base | `--duration-base` 200ms | `duration-base` | `DURATION.base` | Menus, tabs, state changes |
| slow | `--duration-slow` 320ms | `duration-slow` | `DURATION.slow` | Page entrance, drawers, dialogs |
| standard | `--ease-standard` | `ease-standard` | `EASE.standard` | State changes |
| emphasized | `--ease-emphasized` | `ease-emphasized` | `EASE.emphasized` | Things entering |

Animations: `animate-enter` / `.page-enter` (page entrance), `animate-pop`
(menus, tooltips), `animate-drawer-right`, `animate-sheet-up`,
`animate-modalScaleIn`, `animate-fadeIn`, `.skeleton` shimmer. Buttons, chips
and icon buttons scale to 97% while pressed (`active:scale-press`).

Rules:
- Animate only `opacity` and `transform`: no layout shift.
- Entrance keyframes end on `transform: none`, so a finished animation leaves no
  transform behind (a leftover transform would become the containing block for
  `position: fixed` children such as modals and the booking bar).
- `prefers-reduced-motion: reduce` makes every CSS animation and transition
  effectively instant (global rule in `index.css`); framer-motion code uses
  `useReducedMotion()` / `useReducedMotionPreference()` and `fadeUp(reduce)`.
- Nothing animates continuously except loading indicators and the opt-in hero.

## 6. Components

Import from `components/ui` (`import { Button, Tabs } from "../components/ui"`).

| Component | File | Notes |
| --- | --- | --- |
| `Button`, `IconButton` | `Button.jsx` | Variants `primary · secondary · ghost · danger · danger-solid · success`; sizes `sm · md · lg`; `loading` + `loadingText` (disables, `aria-busy`); `to` renders a router link. `IconButton` requires `label`. |
| `TextField`, `PasswordField`, `SearchInput`, `Select`, `TextArea`, `Choice`, `Switch` | `Input.jsx` | Labels, hints and errors wired with `htmlFor` / `aria-describedby` / `aria-invalid`. `SearchInput` has a clear button and Escape-to-clear. `Switch` is `role="switch"`. |
| `Field` | `Field.jsx` | Label + any custom control + hint/error |
| `Card` | `Card.jsx` | Panel with optional title/description/actions header |
| `PageHeader`, `StatCard` | `PageHeader.jsx` | Page `h1`, eyebrow, breadcrumbs, actions |
| `Tabs`, `TabPanel`, `SegmentedControl` | `Tabs.jsx` | ARIA tabs with roving focus (arrows, Home, End); variants `segmented · pills · underline`. `SegmentedControl` uses `aria-pressed` for view switches. |
| `Modal`, `ConfirmDialog` | `Modal.jsx`, `ConfirmDialog.jsx` | Focus trap, Escape, backdrop close, focus return, scroll lock; bottom sheet on phones |
| `Drawer` | `Drawer.jsx` | Side or bottom sheet with the same dialog behaviour |
| `Tooltip` | `Tooltip.jsx` | Hover + focus, Escape to dismiss, `aria-describedby`. Never the only place information lives. |
| `Breadcrumbs`, `Pagination` | `Navigation.jsx` | `aria-current`, "Showing 1–12 of 40" |
| `ToastProvider`, `useToast` | `Toast.jsx` | Polite live region, auto-dismiss |
| `Spinner`, `PageLoader`, `InlineLoader`, `Skeleton`, `SkeletonText`, `TableSkeleton`, `MovieGridSkeleton`, `EmptyState`, `ErrorState` | `Feedback.jsx` | Loading, empty and error states |
| `Icon` | `Icon.jsx` | Stroke icons, `aria-hidden` by default |

CSS-only patterns: `.badge-*`, `.alert-*`, `.chip`/`.chip-active`, `.menu`/`.menu-item`,
`.data-table` inside `.table-wrap`, `.stat-card`, `.checkbox`/`.radio`, `.select`.

Behaviour hooks (`lib/a11y.js`): `useFocusTrap`, `useScrollLock` (reference-counted
for stacked overlays), `useDismiss` (outside press + Escape), `rovingKeyDown`.

### Interaction states

Every interactive component has:
- **hover**: a fill or border step up (`fill` → `fill-strong`, `line` → `line-strong`)
- **focus-visible**: a 2px `brand-400` outline, offset 2px (global rule; don't remove it)
- **active**: `scale-press` on buttons and chips
- **disabled**: 50% opacity, `not-allowed` cursor, no hover or press change
- **loading** (buttons): spinner, label kept or replaced by `loadingText`, `aria-busy`

## 7. Themes

The five themes (Electric Blue default, Royal Violet, Crimson Red, Emerald Green,
Amber Gold) swap only the accent variables. The choice is saved in
`localStorage["cinebook:theme"]`, applied before first paint by the inline script
in `public/index.html`, and synced across tabs (`lib/theme.js`). Canvas and
three.js read theme colours with `themeColor("brand-500")` / `useThemeColors()`.

When adding a theme, define every `--brand-*`, `--accent-*`, `--grad-*`,
`--brand-solid`, `--on-brand` and `--on-accent`, and check `--on-brand` on
`--brand-solid` is ≥ 4.5:1.

## 8. Responsive behaviour

Breakpoints: `xs` 420 · `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536.
Validated at 390, 768, 834, 1280 and 1440px.

- Navigation collapses into the `Drawer` below `lg`.
- Dialogs become bottom sheets below `sm`.
- Tab and chip rows scroll sideways instead of wrapping on phones.
- Tables scroll inside `.table-wrap` (min width 640px) rather than the page.
- Touch targets are at least 40px for primary controls (buttons, icon buttons,
  inputs); `Choice` rows are 44px.
