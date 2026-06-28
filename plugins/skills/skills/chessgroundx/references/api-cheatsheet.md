# chessgroundx API cheat-sheet

Distilled from the installed `node_modules/chessgroundx/*.d.ts` (v10.7.5). This is the fork's surface —
**use it over Context7/upstream when signatures matter.** Re-verify against `node_modules` if the
version has changed.

## Table of contents

- [Entry point](#entry-point)
- [The `Api` object](#the-api-object-apidts)
- [`Config` — full surface](#config--full-surface-configdts)
- [Defaults that bite](#defaults-that-bite-statejs)
- [Built-in brushes](#built-in-brushes)
- [Key `cg.*` types](#key-cg-types-typesdts)
- [`DrawShape`](#drawshape-drawdts)
- [Fork-only / variant surface](#fork-only--variant-surface)

## Entry point

```ts
import { Chessground } from "chessgroundx"; // returns an Api
const api = Chessground(containerEl, config); // config is optional
```

In this repo, always dynamically imported in a browser context:
`const { Chessground } = await import("chessgroundx");`

## The `Api` object (`api.d.ts`)

| Method | Signature | Use |
|---|---|---|
| `set` | `(config: Config) => void` | **The workhorse.** Reconfigure anything at any time; how you push updates. |
| `state` | `State` | Live mutable state (read-only in practice). |
| `getFen` | `() => cg.FEN` | Export the board's current position. |
| `toggleOrientation` | `() => void` | Flip the board. |
| `move` | `(orig, dest) => void` | Programmatically move a piece (animated). |
| `setPieces` | `(pieces: cg.PiecesDiff) => void` | Add/remove/replace specific pieces. |
| `selectSquare` | `(key \| null, force?) => void` | Programmatic selection. |
| `newPiece` | `(piece, key, fromPocket) => void` | Drop a new piece (editor/crazyhouse). |
| `playPremove` | `() => boolean` | Execute a queued premove (call after opponent moves). |
| `cancelPremove` / `cancelMove` | `() => void` | Clear pending premove / in-progress move. |
| `stop` | `() => void` | Stop all interaction (freeze). |
| `setShapes` | `(shapes: DrawShape[]) => void` | Replace **user** shapes. |
| `setAutoShapes` | `(shapes: DrawShape[]) => void` | Replace **programmatic** shapes (arrows you manage). |
| `getKeyAtDomPos` | `(pos) => Key \| undefined` | Hit-test a pixel position to a square. |
| `redrawAll` | `cg.Redraw` | Force a full redraw. |
| `destroy` | `() => void` | **Tear down — call on unmount.** |
| `explode` | `(keys) => void` | Atomic-style explosion animation. |
| `changePocket` / `selectPocket` | pocket ops | Variants with pockets (crazyhouse/shogi). |

## `Config` — full surface (`config.d.ts`)

Everything is optional; pass only what you set. Pass the same shape to `set()` to update.

```ts
interface Config {
  fen?: cg.FEN;
  orientation?: cg.Color;             // 'white' | 'black'
  turnColor?: cg.Color;               // whose turn the board believes it is
  check?: cg.Color | boolean | cg.Key[]; // highlight king(s) in check
  lastMove?: cg.Orig[];               // squares to tint as the last move
  coordinates?: boolean;              // rank/file labels
  autoCastle?: boolean;               // king-moves-two => move rook automatically
  viewOnly?: boolean;                 // disable ALL interaction
  disableContextMenu?: boolean;
  addPieceZIndex?: boolean;
  addDimensionsCssVarsTo?: HTMLElement;
  dimensionsCssVarsSuffix?: string;
  blockTouchScroll?: boolean;

  highlight?: { lastMove?: boolean; check?: boolean };
  animation?: { enabled?: boolean; duration?: number };

  movable?: {
    free?: boolean;                   // DEFAULT true: any piece anywhere. Set false for chess.
    color?: cg.Color | 'both';        // which side may move; undefined = none
    dests?: cg.Dests;                 // Map<orig, dest[]> of legal moves you supply
    showDests?: boolean;              // render move-target dots
    events?: {
      after?: (orig, dest, metadata: cg.MoveMetadata) => void;       // after a normal move
      afterNewPiece?: (piece, key, metadata) => void;                // after dropping a new piece
    };
    rookCastle?: boolean;
  };

  premovable?: {
    enabled?: boolean;
    premoveFunc?: cg.Premove; predropFunc?: cg.Predrop;
    castle?: boolean; dests?: cg.Key[];
    events?: { set?: (orig, dest, meta?) => void; unset?: () => void };
  };

  draggable?: {
    enabled?: boolean; distance?: number; autoDistance?: boolean;
    showGhost?: boolean; deleteOnDropOff?: boolean;
  };

  selectable?: { enabled?: boolean; selected?: cg.Selectable; fromPocket?: boolean };

  events?: {
    change?: () => void;                                  // any state change
    move?: (orig, dest, capturedPiece?) => void;          // a move happened (incl. programmatic)
    dropNewPiece?: (piece, key) => void;
    select?: (key) => void;                               // a square was selected
    insert?: (elements: cg.Elements) => void;             // DOM elements created — hook for custom UI
  };

  drawable?: {
    enabled?: boolean;                // DEFAULT true: user can draw with right-drag
    visible?: boolean;
    defaultSnapToValidMove?: boolean;
    eraseOnClick?: boolean;
    shapes?: DrawShape[];             // user shapes
    autoShapes?: DrawShape[];         // your programmatic shapes
    brushes?: DrawBrushes;            // custom brush colors
    onChange?: (shapes: DrawShape[]) => void;
  };

  // Fork-only / variant — leave unset for standard 8×8:
  dimensions?: cg.BoardDimensions;    // { width, height }
  notation?: cg.Notation;
  kingRoles?: cg.Role[];
  pocketRoles?: cg.PocketRoles;
}
```

## Defaults that bite (`state.js` `defaults()`)

These apply when you **omit** a field — several are surprising:

| Field | Default | Why it matters |
|---|---|---|
| `movable.free` | **`true`** | Fresh board is a free editor: drags any piece anywhere. Set `false` for play. |
| `movable.color` | **`'both'`** | Both sides movable until you scope it. |
| `movable.showDests` | `true` | Dots show (once `dests` is set). |
| `drawable.enabled` | **`true`** | Users can right-drag arrows unless you set `false`. |
| `draggable.enabled` | `true` | Drag is on. |
| `draggable.distance` | `3` | Min px before a drag starts. |
| `selectable.enabled` | `true` | Click-to-move is on. |
| `premovable.enabled` | `true` | Premoves allowed by default. |
| `animation.enabled` / `duration` | `true` / `200` | 200 ms glide. |
| `highlight.lastMove` / `check` | `true` / `true` | On by default. |
| `coordinates` | `true` | Labels on. |
| `orientation` / `turnColor` | `'white'` / `'white'` | — |
| `ranksPosition` | `'right'` | Coordinate placement. |
| `viewOnly` | `false` | Interactive by default. |
| `dimensions` | `{ width: 8, height: 8 }` | Standard board. |
| `notation` | `Notation.ALGEBRAIC` | — |
| `kingRoles` | `['k-piece']` | Role-letter naming (see theming). |

## Built-in brushes

`green` `#15781B`, `red` `#882020`, `blue` `#003088`, `yellow` `#e68f00`, plus pale (opacity ~0.35–0.4):
`paleGreen`, `paleRed`, `paleBlue`, `paleGrey`. All `lineWidth` 10 (pale 15). Override/extend via
`drawable.brushes`.

## Key `cg.*` types (`types.d.ts`)

```ts
type Color = 'white' | 'black';
type Key = 'a0' | `${File}${Rank}`;   // 'a0' is the off-board / drop sentinel
type Orig = DropOrig | Key;
type FEN = string;
type Dests = Map<Orig, Key[]>;         // what you feed movable.dests
type Role = `${'' | 'p'}${Alphabet | '_'}-piece`; // e.g. 'p-piece','n-piece','k-piece' — ROLE-LETTER, not piece-name
interface Piece { role: Role; color: Color; promoted?: boolean; mirror?: boolean }
interface MoveMetadata { premove: boolean; ctrlKey?: boolean; holdTime?: number; captured?: Piece }
// DOM nodes carry identity props:
interface SquareNode extends HTMLElement { cgKey: Key }       // <square cgKey="e4">
interface PieceNode  extends HTMLElement { cgKey: Key; cgPiece: string } // <piece>
```

Note the fork widens files to `a..p` and ranks to `1..@` (16×16 max) to support large variant boards;
standard chess uses `a..h` / `1..8`.

## `DrawShape` (`draw.d.ts`)

```ts
interface DrawShape {
  orig: cg.Key;
  dest?: cg.Key;            // omit for a circle on `orig`; include for an arrow
  brush?: string;          // brush key (built-in or custom)
  modifiers?: { lineWidth?: number };
  piece?: DrawShapePiece;  // draw a ghost piece on a square
  customSvg?: string;      // inject arbitrary SVG
}
```

**No `label` field in this fork** (upstream has it). Don't copy Context7's labelled-arrow example.

## Fork-only / variant surface

`dimensions`, `notation` (`Notation` enum: ALGEBRAIC, SHOGI_*, XIANGQI_*, JANGGI, THAI_ALGEBRAIC),
`kingRoles`, `pocketRoles`, plus `changePocket`/`selectPocket`/`fromPocket` exist for non-chess variants
(shogi, xiangqi, crazyhouse). **Mutavo does not use these** — its variants are standard 8×8 FENs with
rules handled by ffish, so the board config stays vanilla. Touch this surface only for a genuinely
non-8×8 or pocket-based variant.
