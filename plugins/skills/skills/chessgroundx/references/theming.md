# chessgroundx theming

chessgroundx is **styled entirely in CSS** — board, pieces, highlights, arrows. There is no JS theming
API. You restyle by importing the right stylesheets and overriding a small set of well-known classes
and CSS variables. This file is the map; the live implementation is `src/app/globals.css` (board) and
`src/components/chessgroundPieces.css` (pieces).

## The three CSS layers you import

Every board mounts these, in order:

```ts
import "chessgroundx/assets/chessground.base.css";   // 1. structural — REQUIRED, do not restyle away
import "chessgroundx/assets/chessground.brown.css";  // 2. a board color theme (we override it)
import "./chessgroundPieces.css";                     // 3. piece art — OUR file, REQUIRED (see gotcha)
```

1. **`chessground.base.css`** — layout, sizing, square grid, drag/animation mechanics. **Always import
   it.** Removing or overriding its structural rules breaks the board geometry. The bundled assets are
   `chessground.base.css`, `chessground.brown.css`, `chessground.cburnett.css` (see `node_modules/chessgroundx/assets/`).
2. **A board theme** (`chessground.brown.css`) — square colors. We import it for completeness but
   override the colors with CSS variables (below), so the brown is never actually seen.
3. **Piece art** — see the gotcha; the bundled `cburnett.css` does **not** work with this fork.

## ⚠️ The piece-class gotcha (most common "blank board" cause)

Upstream chessground names piece elements by **piece name** (`.pawn`, `.knight`, …). **chessgroundx
names them by role letter** — `piece.p-piece`, `piece.n-piece`, `piece.k-piece`, … (see the `Role` type
in `types.d.ts`: `` `${'' | 'p'}${Alphabet | '_'}-piece` ``). So the bundled `chessground.cburnett.css`,
which targets the old class names, **paints nothing** — you get correctly-placed but invisible pieces.

Mutavo solves this with a generated stylesheet, `src/components/chessgroundPieces.css`
(produced by `scripts/gen-piece-css.mjs`), whose selectors match the fork:

```css
.cg-wrap piece.p-piece.white { background-image: url("data:image/svg+xml;base64,…"); }
.cg-wrap piece.n-piece.black { background-image: url("data:image/svg+xml;base64,…"); }
/* …all 12 = {p,n,b,r,q,k} × {white,black} */
```

The art is inlined as **base64 data URIs** deliberately: the app is `crossOriginIsolated` (COOP/COEP for
the WASM engine), and same-origin inline assets sidestep cross-origin image restrictions. If you add a
new piece set, generate it the same way (or keep it same-origin) rather than hot-linking external SVGs.

**Symptom → cause:** pieces are blank/invisible but squares and coordinates render → wrong/missing piece
CSS. Import `chessgroundPieces.css`, or regenerate it.

## Board colors via CSS variables (the themable surface)

The board squares are repainted by overriding chessgroundx's `cg-board` with `!important` against CSS
variables, so themes can be swapped at runtime by changing the variables (no board rebuild):

```css
:root {
  --mv-board-light: #d7e0e6;
  --mv-board-dark:  #2b3b46;
  --mv-board-last:  rgba(52, 211, 153, 0.42); /* last-move tint */
  --mv-board-selected: rgba(16, 185, 129, 0.5);
  --mv-board-dot:   #0f5f47;                   /* move-target dot */
}

.cg-wrap cg-board {
  background-color: var(--mv-board-light) !important;
  background-image: repeating-conic-gradient(
    var(--mv-board-dark) 0% 25%, var(--mv-board-light) 0% 50%) !important;
  background-size: 25% 25% !important;
}
```

Runtime theme switching is done by a no-flash inline script in `layout.tsx` that sets the
`--mv-board-*` variables on `<html>` before first paint, so there's no theme flicker on load.

## Square state classes you can target

chessgroundx adds these classes to `<square>` nodes; restyle them to theme highlights:

| Class | When | Mutavo override |
|---|---|---|
| `.last-move` | the `lastMove` squares | `--mv-board-last` tint |
| `.selected` | the currently selected square | `--mv-board-selected` tint |
| `.move-dest` | a legal target (from `dests`, with `showDests`) | radial `--mv-board-dot` |
| `.move-dest:hover` | hovered target | darker dot |
| `.oc.move-dest` | a capture target (`oc` = occupied) | ring instead of dot |
| `.check` | king in check (with `highlight.check`) | red radial |

Pieces also expose `.cg-wrap piece.{role-letter}-piece.{color}` (art) — see above.

## Dark mode

There's no library dark-mode toggle — it's just which CSS-variable values are active. Drive it the same
way Mutavo drives any theme: swap the `--mv-board-*` (and app `--mv-*`) variables on `<html>`. Because
the board reads everything through variables, dark mode is "set the variables differently," nothing more.

## Custom shape/arrow colors

Arrow/circle colors come from **brushes**, not CSS. Built-ins: `green`, `red`, `blue`, `yellow`, and
pale variants. Add your own at config time:

```ts
drawable: {
  brushes: {
    myBrush: { key: "mb", color: "#a855f7", opacity: 0.9, lineWidth: 10 },
  },
  autoShapes: [{ orig: "e2", dest: "e4", brush: "myBrush" }],
}
```

(Reminder from the cheat-sheet: this fork's `DrawShape` has **no `label`** field, unlike upstream.)

## Sizing

The board fills its `.cg-wrap` container; size that wrapper (square aspect ratio) with your own CSS —
chessgroundx has no width prop. It's a fluid layout: resize the wrapper any time and the board follows.

## Checklist for any visual change

- Keep `chessground.base.css` imported and structurally intact.
- Pieces invisible? → `chessgroundPieces.css` missing or out of date (role-letter classes).
- Theme a color? → change a `--mv-board-*` variable, don't hand-edit square rules.
- New piece set? → generate same-origin (data URI / local), match `piece.{letter}-piece.{color}`.
- New arrow color? → add a brush, not a CSS rule.
