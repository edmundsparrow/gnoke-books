# Gnoke Books — Page-Flip Emag Engine

A vanilla JS/CSS/HTML page-flip magazine shell. No build step, no framework —
add a page, it's part of the issue.

## What's engine vs. what's this issue

- **Engine** (reusable): `js/app.js`, `sw.js`, `manifest.json`, the app-shell
  CSS in `css/style.css` (navigation, page transitions,
  theming tokens).
- **This issue** (bespoke): the `<section class="page">` blocks inside
  `index.html` — the actual Comfort Food content, recipe card, Bolle & Fish
  feature, etc.

Swap the content, keep the engine, and you have a new issue.

## Adding a page

Every page is a `<section class="page" data-page="N">` inside `#pages` in
`index.html`. `app.js` reads pages from the DOM — there's no page list to
maintain elsewhere.

```html
<section class="page" data-page="N">
  <div class="folio"><span>Section Label</span><span>NN</span></div>
  <div class="eyebrow">Kicker</div>
  <h1 class="headline">Page Title</h1>
  <p>Your content…</p>
</section>
```

Renumber `data-page` on this and every following section to keep it
sequential, and update the back cover's `data-page` to match the new total.
`total` and progress ("N / total") are computed from `pages.length`, so
nothing else in `app.js` needs touching.

**Also update the Table of Contents.** Unlike page navigation, the TOC on
page 1 is a manually maintained list — `data-goto="N"` on each `<li>` and
its printed page number are plain text, not computed from the DOM. Reorder,
add, or remove a page and the TOC will silently point to the wrong page (or
a page that no longer exists) until you fix it by hand. This has already
happened once in this project — check every `data-goto` against the real
page order before shipping.

## Theming

All color/type tokens live in `:root` at the top of `css/style.css`
(`--paper`, `--ink`, `--accent`, `--serif`, `--sans`, `--mono`, etc). Reskin
an issue by changing those, not by hunting through component rules.

## Navigation

Arrow keys, swipe, and prev/next buttons are wired generically off the
`.page` collection — no per-page JS required.

