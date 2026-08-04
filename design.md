# Design Standard — Ecommerce
### Shared reference for all teams. Keep every screen traceable back to this page.

---

## Principles

- **Product first.** The UI's job is to make the product photography and copy look good — it should feel quiet and premium, never louder than what's being sold.
- **Warm neutral, not stark.** The base palette is ivory and ink, not pure white-and-black — it should feel like paper and print, not a template.
- **One accent, used with intent.** Clay is the only color allowed to shout — for CTAs, prices, and sale/limited-stock cues. Everything else stays neutral.
- **No trend-chasing.** No gradients, no glassmorphism, no neon glows, no purple-blue "AI" palettes. If it looks like a template, it's wrong.

---

## Color Palette

| Token | Hex | Use |
|---|---|---|
| Background | `#FAF7F2` | Page canvas — warm ivory, not white |
| Surface | `#FFFFFF` | Cards, product tiles, modals |
| Border | `#E8E2D8` | Dividers, card outlines — always this sand tone, never gray |
| Ink | `#1E1C1A` | Primary text, headlines |
| Muted | `#79746C` | Secondary text, captions, meta |
| **Clay** (primary accent) | `#BB5A3C` | CTAs, price, active states, links — the one color allowed to draw the eye |
| Olive (secondary accent) | `#4B5842` | Secondary buttons, tags, badges — used sparingly, never competes with Clay |

**Status colors** (stock/order states only — never decorative):
| State | Hex |
|---|---|
| In stock / success | `#5C7A52` |
| Low stock / warning | `#C08A3E` |
| Out of stock / sale / danger | `#B23A2E` |

Rule: every color on the site traces back to this table. New situation, new opacity of an existing token — never a new hue.

---

## Typography

- **Headlines / product titles:** a high-contrast serif (Fraunces, Canela, or similar) — editorial, a little fashion-magazine. Used for hero text, product names, section titles only.
- **Body / UI / prices:** a clean grotesk sans (Inter, Neue Montreal, or similar) — everything functional: nav, descriptions, buttons, filters, checkout.
- Two typefaces, no more. Prices and buttons are always sans, never serif.
- Generous line-height on body copy (1.5–1.6) — this is a browsing/reading experience, not a dashboard.

---

## Layout

- Corner radius: small and consistent — 4–8px. Sharp enough to feel considered, not sharp enough to feel cold.
- Whitespace over borders — let the ivory background do the separating; use the sand border only where two surfaces genuinely need a hard edge (e.g. a table, a filter panel).
- Grid-based product layouts, generous gutters — don't crowd product tiles.
- Imagery is the hero: product photos get the most visual weight on any page; UI chrome (nav, filters, badges) stays visually quiet by comparison.

---

## Components — brief

- **Primary button:** Clay fill, ivory text, small radius. One per view.
- **Secondary button:** outline or Olive-tinted, never competes with the primary CTA.
- **Price:** Ink, sans, slightly heavier weight than surrounding text — always legible at a glance, no decoration needed.
- **Tags/badges** (New, Sale, Low Stock): small pill, tinted background at low opacity of the relevant status/accent color — never a hard solid fill.
- **Cards:** white surface, sand border or soft shadow (pick one, stay consistent site-wide), image-forward — text/price sit below, not overlaid on the photo unless it's a deliberate hero banner.

---

## Do / Don't

**Do:** ivory + ink + one clay accent · serif headlines + sans everything else · quiet UI, loud product photography · consistent small radius throughout.

**Don't:** gradients or glow effects · more than two accent colors on one screen · serif on buttons or prices · stock photography-style "AI generated" visuals · borders on every single element (let whitespace do the work).