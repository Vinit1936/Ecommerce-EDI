# Design Standard — ++hellohello
### Shared reference for all teams. Keep every screen traceable back to this page.
### Reference: shop grid, PDP, and bag screenshots (++hellohello, Montevideo)

---

## Principles

- **Loud brand, plain reading.** Red is the brand's voice — headlines, nav, prices, tags, footer. Black/ink is reserved for actual reading copy — product descriptions, disclaimers, fine print. Never mix the two roles.
- **Brutalist, not decorative.** Sharp corners, hairline rules, no shadows, no gradients. The grid and the type do the work — nothing is there to look "nice," everything is there on purpose.
- **Type is the hero as much as the product.** Oversized, tightly-set display headlines carry as much visual weight as the photography. This is an editorial/streetwear catalogue, not a soft retail template.
- **Dry, deadpan copy.** Microcopy has a wink to it ("Made to be worn. Or judged. Or both.") — never generic e-commerce filler ("Shop our new collection!").
- **Flat imagery, full bleed.** Product photography runs edge-to-edge in its container, square-cropped, no rounding, no drop shadow. The photo backdrop (gray, red, studio white) does the framing — the UI doesn't add its own.

---

## Color Palette

| Token | Hex | Use |
|---|---|---|
| Canvas | `#EFE7DC` | Page background — warm ivory/bone, every page |
| Ink | `#161412` | Reading copy: product descriptions, disclaimers, long-form text |
| **Signal Red** (primary / only accent) | `#F0301A` | Headlines, nav, prices, links, tags, quantity controls, footer, rules — the brand's entire voice |
| White | `#FFFFFF` | Product photography backdrops only (never a UI surface/card color) |
| Black | `#0A0A0A` | Product photography backdrops only, and the filled dot in the header mark |

Rule: **there are only three colors on this site** — ivory canvas, signal red, and ink black. No tints, no secondary accent, no gray scale for UI chrome. If something needs a fourth color, it's photography, not UI.

**Where red vs. ink is used (memorize this table, it's the whole system):**

| Element | Color |
|---|---|
| Page-level headline ("YOUR BAG", "OUTFIT") | Red |
| Nav links, active-page underline | Red |
| Prices, subtotal amount | Red |
| Quantity stepper (– / count / +) | Red |
| "Delete" / "Checkout ↗" / all text-links | Red |
| Category tag + dot ("● APPAREL") | Red |
| Footer text (all of it, including address) | Red |
| Hairline dividers | Red |
| Product description paragraph | Ink |
| "Taxes and shipping will be calculated..." fine print | Ink |
| "Sold out" status | Red, struck through |

---

## Typography

Two families, used for distinctly different jobs — never interchange them.

- **Display Grotesk** (e.g. Neue Haas Grotesk Display, ArgentCF, or similar ultra-bold condensed-ish grotesk): page-level headlines, nav, all-caps labels, prices, UI text, footer. This is almost everything on the site. Set page headlines ("YOUR BAG", "OUTFIT") at massive scale — wide enough to span the full content width in 1–2 words, tight letter-spacing, no lowercase.
- **Display Serif** (e.g. a high-contrast editorial serif like Canela, Reckless, or GT Sectra): reserved *only* for individual product names on the PDP ("Specimen No. HH01"). This is the one deliberate typographic contrast on the site — it signals "this is the product," nothing else ever uses it.
- Closing statement headlines ("Made to be worn. Or judged. Or both.") use the Display Grotesk at large scale but in **sentence case**, not all-caps — this distinguishes a "brand voice" line from a "page title" line.
- Body copy (descriptions, disclaimers) uses a plain grotesk at regular weight, ink color, comfortable line-height (1.4–1.5) — legible and quiet, since it's the one place the eye should slow down and read rather than scan.
- All-caps is reserved for: page titles, nav, category tags ("APPAREL"), footer nav columns, colophon labels ("WHY", "VISIT ++ WEBSITE"). Sentence case is reserved for: closing statements, product descriptions, product names (serif).

---

## Layout

- **Zero corner radius, always.** No rounded corners anywhere — not on images, not on buttons (there are no filled buttons), not on tags. Square corners only.
- **No shadows, no borders-as-cards.** Product tiles are the photograph, full stop — no card background, no border, no shadow. Separation between elements comes from whitespace and the occasional hairline rule.
- **Hairline rules (~2px, signal red)** mark structural transitions only: under the page headline, above/below cart line items, above the closing statement band, above the footer. Don't add rules between every element — they're punctuation, not wallpaper.
- **Full-bleed, square-cropped photography.** Every product image fills its container edge-to-edge with no padding gutter and no rounding. Multiple images per product stack directly against each other (no gap) as seen on the PDP.
- **Asymmetric/masonry grid on the shop/listing page.** Not a rigid uniform grid — mix large hero-scale tiles (a single tote spanning half the page) with smaller 4-up grid tiles. Vary tile size deliberately to create rhythm, the way an editorial spread would.
- **Header is identical on every page:** "++" mark far left, "Shop" / "Bag (N)" nav center-right with the current page underlined, a three-dot mark (black filled · white/outline · red filled) far right as the constant brand sign-off.
- **Colophon band before the footer, on every page:** a bold sentence-case statement ("Made to be worn. Or judged. Or both.") on the left, a large "©26"-style circular copyright mark on the right, hairline rules above and below.
- **Footer, identical structure on every page:** brand name + rights (col 1), studio address (col 2), "Privacy Policy" standalone (col 3), then two link columns — social (Dribbble/Instagram/LinkedIn/Twitter X) and site (Work/Services/About/Careers) — with "Let's talk" as a final CTA-style link, far right. All footer text is red, small scale, all-caps or sentence case per the label.

---

## Components — brief

- **No filled buttons anywhere on the site.** Every action is a bold red text link, often paired with a diagonal arrow glyph: `Checkout ↗`, and by the same pattern an in-stock PDP action would read `Add to Bag ↗`. The arrow is the only "button" affordance this brand uses.
- **Quantity stepper:** flat text, no box/border — `–  2  +` in red, evenly spaced, sitting to the right of a cart row or under the price on a PDP.
- **Delete / remove:** plain red text, top-right of the row it affects, no icon.
- **Status — sold out:** red text, strikethrough, replaces the "Add to Bag" link in place.
- **Category tag:** a small red filled dot + all-caps red label at 12–13px (e.g. `● APPAREL`) sitting directly under a product tile's name/price row — not a pill, not a background fill, just a dot and text.
- **Product tile (shop grid):** image (full-bleed, square-cropped) → below it, one line with product name on the left and price on the right → category tag beneath that. No card chrome at all.
- **Cart row:** product image on the right, name + price on the left, quantity stepper and "Delete" stacked above/beside the image, hairline red rule below the row.
- **PDP layout:** two columns — left is a vertical stack of full-bleed product photos (no gap between them), right is a sticky-feeling info column: `← Return to Shop` back-link at top, serif product name, red price, ink description paragraph, quantity stepper, then the primary action link (`Add to Bag ↗` or struck-through `Sold out`).

---

## Do / Don't

**Do:** oversized all-caps red display headlines · a bold serif reserved only for product names · thin red hairline rules as the only dividers · flat square-cropped photography with zero rounding · text-link + arrow-glyph actions instead of buttons · dry, deadpan copywriting · red for every piece of brand/UI voice, ink only for reading copy.

**Don't:** rounded corners on anything · drop shadows or card backgrounds · a second accent color beyond red/ink/ivory · filled buttons · gray UI chrome · gradients or soft tints · playful/bouncy microcopy · mixing the serif into anything but product names.
