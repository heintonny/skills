---
name: chessgroundx
description: >-
  Expert guide to chessgroundx — the variant-capable Lichess chessground fork that renders
  every chess board in Mutavo (MutavoBoard, DailyPuzzleBoard, DuellLiveBoard, MagnusPracticeBoard,
  AdminBoard, BoardPreview). Use this WHENEVER you create, edit, debug, or theme a chess board:
  mounting `Chessground()` in React, wiring legal moves via `movable.dests`, reading user moves
  with `movable.events.after`, drawing arrows/circles with `autoShapes`/`setShapes`, rendering an
  arbitrary FEN (including handicap/odds positions with fewer pieces), `viewOnly` analysis boards,
  board flip/orientation, premoves, animations, promotion handling, or piece/board CSS. ALSO use it
  when a board won't update, pieces render blank or unstyled, drags do nothing, the wrong squares are
  movable, SSR/"window is not defined"/hydration errors appear, or you touch any `chessgroundx/*`
  import or `chessgroundPieces.css`. Covers the rules-agnostic renderer↔engine split, the
  create→set→destroy lifecycle, best practices, the common footguns, and how to consult Context7
  (`/lichess-org/chessground`) for the upstream API while accounting for fork drift.
---

# chessgroundx

`chessgroundx` is the chess **board UI** in Mutavo. It is a variant-capable fork (by gbtami) of
Lichess's [chessground](https://github.com/lichess-org/chessground). It draws the board, pieces,
drags, highlights, and SVG arrows — and **nothing else**. Installed version here: see
`node_modules/chessgroundx/package.json` (currently **10.7.5**, **GPL-3.0**).

## The one mental model that matters: it is a rules-agnostic renderer

chessgroundx contains **no chess logic**. It does not know what's legal, whose turn it "really" is,
or whether a king is in check — it only knows what you *tell* it. In Mutavo the division of labour is:

- **chessgroundx** = pixels + input. Renders a position, accepts drags/clicks, reports the attempted
  `(orig, dest)`, draws shapes.
- **ffish-es6** (Fairy-Stockfish) = the brain. Decides legality, generates the legal-move map, applies
  moves, knows the variant, detects check/mate.

Everything good about working with this library follows from respecting that split. You **feed it**
legality (`movable.dests`), and you **read back** attempted moves (`movable.events.after`) to hand to
the engine. Never expect the board to validate anything.

This is also *why the library is the right tool for Mutavo's hard requirement*: it parses any FEN with
**no piece-count or legality validation**, so a handicap position (a knight removed, fewer pieces,
odds setups) renders fine. The engine, not the board, owns "is this legal."

## Source of truth, and how to use Context7

The **canonical API is the installed type definitions** — read these first when unsure:

- `node_modules/chessgroundx/config.d.ts` — every `Config` option (what you pass in)
- `node_modules/chessgroundx/api.d.ts` — every method on the returned `Api`
- `node_modules/chessgroundx/types.d.ts` — `cg.*` types (`Key`, `Dests`, `Color`, `Role`, `MoveMetadata`, …)
- `node_modules/chessgroundx/state.js` `defaults()` — the literal default values (the defaults bite; see below)

**Context7 does not have chessgroundx.** It has the upstream library as `/lichess-org/chessground`.
Use it for *concepts and canonical examples* (init, FEN, drawable/autoShapes), but treat it as
**upstream, which has drifted from the fork**. Known drifts that will mislead you if you trust Context7
blindly:

| Thing | Upstream (Context7) | chessgroundx (installed) |
|---|---|---|
| Package name | `@lichess-org/chessground` | `chessgroundx` |
| `DrawShape.label` | exists (text labels on arrows) | **does not exist** — see `draw.d.ts` |
| Board size | 8×8 only | `dimensions`, `notation`, `kingRoles`, `pocketRoles` for variants |
| Piece classes | piece-name based | role-letter based (`p-piece`, `n-piece`, …) — affects theming |

Rule of thumb: **Context7 for "how does feature X work conceptually"; the local `.d.ts` for "what
exactly is the signature in *our* version."** When they disagree, the `.d.ts` wins.

To pull upstream docs: `resolve-library-id` → `/lichess-org/chessground`, then `query-docs`.

## The lifecycle recipe (create once → `set()` → `destroy`)

chessgroundx is an **imperative DOM library**, not a React component. The whole React integration is
three moves, and every board in this repo follows them. Get these right and 90% of bugs disappear.

1. **Create once** into a container ref, store the `Api` in a ref. Never recreate it on every render —
   that's slow and drops board state.
2. **Update by calling `api.set(partialConfig)`** when your data changes. `set()` is a cheap,
   reconfigure-anything-at-any-time diff. This is the *only* way you push new positions, turn, legal
   moves, highlights, or shapes after mount.
3. **Destroy on unmount** via `api.destroy()` (and `board.delete()` for the ffish board) to avoid leaks.

Minimal shape (full annotated template in `references/react-recipe.md`):

```tsx
"use client"; // chessgroundx is browser-only — see Don'ts
const wrapRef = useRef<HTMLDivElement>(null);
const apiRef = useRef<Api | null>(null);

useEffect(() => {
  let disposed = false;
  (async () => {
    const { Chessground } = await import("chessgroundx"); // dynamic import: keeps it out of SSR
    if (disposed || !wrapRef.current) return;
    apiRef.current = Chessground(wrapRef.current, baseConfig());
  })();
  return () => { disposed = true; apiRef.current?.destroy(); apiRef.current = null; };
}, []); // create-once: empty deps

// later, on new data:
apiRef.current?.set({ fen, turnColor, lastMove, check, movable: { color, dests } });
```

## Config you'll actually use

Defaults are in `state.js`; the full surface is in `references/api-cheatsheet.md`. The high-value ones:

| Option | What it does | Mutavo norm |
|---|---|---|
| `fen` | position to render (any FEN; missing pieces OK) | `board.fen()` from ffish |
| `orientation` | `'white'`/`'black'` — which side is on the bottom | fixed, or from the player's color |
| `turnColor` | whose turn the board *thinks* it is (drives premove/UI) | kept in sync with ffish |
| `movable.free` | **default `true`** — any piece moves anywhere | **set `false`** for real play |
| `movable.color` | which side the user may move (`'white'`/`'black'`/`'both'`/`undefined`) | the player's color; `undefined` to lock |
| `movable.dests` | `Map<orig, dest[]>` of legal moves — the legality you feed in | `legalDests(board)` from ffish |
| `movable.showDests` | render the move-target dots | `true` |
| `movable.events.after` | `(orig, dest, meta)` callback after a user move | resolve to UCI, send to engine |
| `highlight` | `{ lastMove, check }` square tinting | `{ lastMove: true, check: true }` |
| `animation` | `{ enabled, duration }` piece glides | `{ enabled: true, duration: 200 }` |
| `viewOnly` | kill all interaction (display board) | `true` for analysis/preview |
| `drawable` | user-drawn + programmatic arrows/circles | `{ enabled: false }` unless you want user shapes |
| `coordinates` | rank/file labels | usually `true` |

### Reading a user's move

The `after` callback gives you square keys only — **no promotion piece**:

```ts
movable: {
  free: false,
  color: playerColor,
  dests: legalDests(board) as cg.Dests, // ffish Map<string,string[]> → cg.Dests
  events: {
    after: (orig: cg.Key, dest: cg.Key) => {
      const uci = resolveUciMove(board, orig, dest); // engine resolves promotion (defaults Q) + legality
      if (!uci) return;
      // apply to ffish, sync the board, trigger engine reply / send over WS, etc.
    },
  },
}
```

Promotion is invisible to the board: the `dests` Map collapses `a7→a8` (the four promo moves share one
target square), and `resolveUciMove` appends the suffix (`a8q`). If you ever need under-promotion UI,
you build it in React and pass the chosen role to your resolver — the board won't ask.

### Drawing arrows and circles

Programmatic arrows use `autoShapes` (managed by you) — distinct from `shapes` (the user's own
drawings). Update them live with `api.setAutoShapes([...])` or `api.set({ drawable: { autoShapes } })`.

```ts
const shapes: DrawShape[] = candidates.map(c => ({ orig: c.from, dest: c.to, brush: "green" }));
api.setAutoShapes(shapes);
```

Built-in brushes: `green`, `red`, `blue`, `yellow`, and pale variants `paleGreen`/`paleRed`/`paleBlue`/`paleGrey`.
Add your own via `drawable.brushes`. Reminder: **no `label` field** in this fork (Context7 will show it;
it won't compile here).

## Theming (headline + pointer)

Theming is **CSS-only** — board and pieces restyle by swapping classes/variables, never JS.
The full architecture (which CSS to import, the role-letter piece-class gotcha, CSS-var board theming,
square state classes) is in `references/theming.md`. **Read it before any visual change.** The one thing
to internalize now:

> **The bundled `chessground.cburnett.css` does NOT style chessgroundx pieces.** The fork names piece
> elements by role letter (`piece.p-piece.white`), not by piece name. Mutavo ships its own
> `src/components/chessgroundPieces.css` (generated by `scripts/gen-piece-css.mjs`) for this reason. If
> pieces render as empty/invisible squares, this is almost always why.

## Best practices (the do's — and why)

- **Create the instance once; update with `api.set()`.** The library's speed comes from a custom DOM
  diff; recreating per render throws that away and visibly flickers. `set()` is designed to be called
  constantly and reconfigure anything.
- **Always `'use client'` + dynamic `await import("chessgroundx")`.** It touches `window`/`document` at
  module load; importing it statically into a Server Component or SSR pass crashes the render.
- **Store `Api` (and the ffish `Board`) in `useRef`, not state.** They're mutable imperative handles;
  putting them in state causes needless re-renders and stale closures.
- **Set `movable.free: false` the moment you want real chess.** The default is a free-for-all editor.
  Pair it with `movable.color` and a fresh `movable.dests` every time the position changes.
- **Recompute `dests` from the engine on every position change**, and lock the board between moves with
  `api.set({ movable: { color: undefined, dests: new Map() } })` while the engine/opponent/server is
  thinking. This is how you prevent double-moves and illegal input.
- **Guard async init with a `disposed` flag.** The dynamic import resolves after a tick; a fast unmount
  otherwise mounts a board into a dead node. See the recipe.
- **Keep ffish as the only source of legality and the FEN.** The board should always be rendered *from*
  `board.fen()`, so the renderer can never drift from the engine's truth.
- **For analysis/preview boards use `viewOnly: true`** (optionally `coordinates: false`,
  `animation.enabled: false`) — it disables drag, click, and user drawing in one flag.
- **Reach into the DOM only for ephemeral visual feedback** (e.g. flashing a square), via the
  `cgKey`/`cgPiece` props chessgroundx stamps on `<square>`/`<piece>` nodes — see
  `src/lib/board/moveFeedback.ts`. Never use the DOM to read/write *game* state; that belongs to ffish.

## Don'ts (the footguns — and why they bite)

- **Don't expect the board to enforce legality.** With `free: false` it only restricts to the `dests`
  you supplied; with the default `free: true` it allows *anything*. Legality is never the board's job.
- **Don't import chessgroundx statically at the top of a component file.** "window is not defined" / RSC
  errors come straight from this. Dynamic-import it inside the effect.
- **Don't recreate the board on prop changes.** If your board "resets," "flickers," or loses arrows on
  every update, you're probably re-running `Chessground()` instead of `api.set()`.
- **Don't trust Context7 / upstream examples to compile as-is.** Package name and several fields differ
  (notably `DrawShape.label`). Verify against the local `.d.ts`.
- **Don't rely on the bundled `cburnett.css` for pieces.** Use the repo's `chessgroundPieces.css`
  (role-letter classes). Blank pieces = wrong piece CSS.
- **Don't read promotion from the `after` callback.** It isn't there. Resolve it via the engine
  (default queen) or your own UI.
- **Don't forget `api.destroy()` (and `board.delete()`).** Both hold native/DOM resources; skipping
  cleanup leaks across route changes and re-mounts.
- **Don't set `dimensions`/`notation`/`pocketRoles` unless you genuinely need a non-8×8 variant.**
  Mutavo's "variants" are standard 8×8 FENs with modifiers handled by ffish — the board stays vanilla.

## Reference files

Read the one that matches your task:

- `references/api-cheatsheet.md` — full `Config` + `Api` + `cg.*` types and **all** default values,
  distilled from the `.d.ts`. Go here for exact signatures without grepping `node_modules`.
- `references/react-recipe.md` — the complete, annotated React wrapper (create/update/destroy, ffish
  wiring, dests, locking, orientation, arrows). Copy-paste starting point that matches the repo's idiom.
- `references/theming.md` — the CSS layering model, the piece-class gotcha, CSS-variable board theming,
  square state classes (`last-move`, `selected`, `move-dest`, `check`), and dark mode.
