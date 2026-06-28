# chessgroundx React integration recipe

The complete, annotated wrapper. This is the idiom every board in Mutavo follows
(`MutavoBoard.tsx`, `DailyPuzzleBoard.tsx`, `DuellLiveBoard.tsx`, `MagnusPracticeBoard.tsx`). Copy it,
delete what you don't need. The companion concepts are in `../SKILL.md`; exact signatures in
`api-cheatsheet.md`.

## Why a recipe at all

chessgroundx is imperative and browser-only; React is declarative and renders on the server too.
Bridging them safely is the same five concerns every time: **client-only load, create-once, update via
`set()`, read moves back, destroy on unmount**. Doing any of them wrong produces the classic bugs
(SSR crash, flicker/reset, leaked instances, dead moves). The recipe encodes the safe version of each.

## Interactive board (play against engine / server)

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { Api } from "chessgroundx/api";
import type { Config } from "chessgroundx/config";
import type * as cg from "chessgroundx/types";
import "chessgroundx/assets/chessground.base.css";
import "chessgroundx/assets/chessground.brown.css"; // overridden by our CSS vars; see theming.md
import "./chessgroundPieces.css";                    // REQUIRED: role-letter piece art (see theming.md)

import { legalDests, resolveUciMove } from "@/lib/engine/moves"; // ffish-backed helpers

export function MyBoard({ initialFen, playerColor }: { initialFen: string; playerColor: cg.Color }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const boardRef = useRef<any>(null); // ffish Board — source of truth for legality + FEN

  // 1) CREATE ONCE -----------------------------------------------------------
  useEffect(() => {
    let disposed = false;

    (async () => {
      const [{ Chessground }, board] = await Promise.all([
        import("chessgroundx"),
        initFfishBoard(initialFen), // however you build the ffish Board for this variant
      ]);
      // The await means we resumed on a later tick — the component may already be gone:
      if (disposed || !wrapRef.current) {
        board?.delete?.();
        return;
      }
      boardRef.current = board;
      apiRef.current = Chessground(wrapRef.current, baseConfig(board, playerColor, onUserMove));
    })();

    // 5) DESTROY ON UNMOUNT --------------------------------------------------
    return () => {
      disposed = true;                 // stops the async init from mounting into a dead node
      apiRef.current?.destroy();
      apiRef.current = null;
      boardRef.current?.delete?.();     // ffish native cleanup
      boardRef.current = null;
    };
  }, []); // empty deps: create exactly once

  // 4) READ MOVES BACK -------------------------------------------------------
  function onUserMove(orig: cg.Key, dest: cg.Key) {
    const board = boardRef.current;
    const api = apiRef.current;
    if (!board || !api) return;

    const uci = resolveUciMove(board, orig, dest); // engine resolves promotion (default Q) + legality
    if (!uci) return;                              // illegal/garbage — board already snapped back

    board.push(uci);          // apply to ffish (your API may differ)
    lockBoard(api);           // freeze while the opponent/engine/server responds
    syncBoard(api, board);    // re-render from the engine's new truth
    // ...then trigger engine reply / send over WebSocket / await server verdict, and syncBoard again
  }

  return <div ref={wrapRef} className="cg-wrap" style={{ width: 480, height: 480 }} />;
}

// --- helpers -------------------------------------------------------------

// A factory keeps the create-time and (optionally) update-time config in one place.
function baseConfig(board: any, playerColor: cg.Color, after: (o: cg.Key, d: cg.Key) => void): Config {
  return {
    fen: board.fen(),
    orientation: playerColor,
    turnColor: board.turn() ? "white" : "black",
    coordinates: true,
    highlight: { lastMove: true, check: true },
    animation: { enabled: true, duration: 200 },
    movable: {
      free: false,                              // critical: not a free editor
      color: playerColor,
      dests: legalDests(board) as cg.Dests,     // ffish Map<string,string[]> → cg.Dests
      showDests: true,
      events: { after },
    },
    drawable: { enabled: false },               // no user-drawn arrows on a play board
  };
}

// 2) UPDATE: push new truth from the engine into the renderer.
function syncBoard(api: Api, board: any) {
  const myTurn = /* is it the player's move now? */ true;
  api.set({
    fen: board.fen(),
    turnColor: board.turn() ? "white" : "black",
    lastMove: board.lastMoveSquares?.(),        // [orig, dest] if you track it
    check: board.isCheck?.(),
    movable: {
      color: myTurn ? playerColorOf(board) : undefined,
      dests: myTurn ? (legalDests(board) as cg.Dests) : new Map(),
    },
  });
}

// Lock input (between moves, on game over, while committing to the server).
function lockBoard(api: Api) {
  api.set({ movable: { color: undefined, dests: new Map() } });
}
```

### What each numbered step prevents

1. **Create once** (empty deps) — re-running `Chessground()` on every render is the #1 cause of
   flicker, lost arrows, and dropped selection. The instance is persistent; you mutate it.
2. **Update via `set()`** — never rebuild to show a new position. `set()` diffs and animates.
3. *(client-only load)* — `await import("chessgroundx")` inside the effect + `"use client"` keeps the
   library out of the server bundle and the SSR pass, avoiding "window is not defined".
4. **Read moves back** — `movable.events.after` gives `(orig, dest)` only; the engine resolves
   promotion + final legality. If `resolveUciMove` returns null, chessgroundx has already snapped the
   piece back (because the move wasn't in `dests`).
5. **Destroy** — `api.destroy()` unbinds listeners and DOM; `board.delete()` frees ffish's native
   memory. The `disposed` flag covers the race where unmount beats the async import.

## View-only board (analysis / preview / arrows)

No moves, no ffish needed — just render a FEN and optionally annotate it.

```tsx
"use client";
import { useEffect, useRef } from "react";
import type { Api } from "chessgroundx/api";
import type { DrawShape } from "chessgroundx/draw";
import type * as cg from "chessgroundx/types";
import "chessgroundx/assets/chessground.base.css";
import "chessgroundx/assets/chessground.brown.css";
import "./chessgroundPieces.css";

export function AnalysisBoard({ fen, arrows = [] }: { fen: string; arrows?: { orig: string; dest: string; brush: string }[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);

  // create once
  useEffect(() => {
    let disposed = false;
    (async () => {
      const { Chessground } = await import("chessgroundx");
      if (disposed || !wrapRef.current) return;
      apiRef.current = Chessground(wrapRef.current, {
        fen,
        viewOnly: true,                 // disables drag, click, and user drawing in one flag
        coordinates: true,
        drawable: { enabled: false, autoShapes: toShapes(arrows) },
      });
    })();
    return () => { disposed = true; apiRef.current?.destroy(); apiRef.current = null; };
  }, []);

  // update on new fen/arrows — separate effect, still just set()
  useEffect(() => {
    apiRef.current?.set({ fen, drawable: { autoShapes: toShapes(arrows) } });
  }, [fen, arrows]);

  return <div ref={wrapRef} className="cg-wrap" style={{ width: 360, height: 360 }} />;
}

function toShapes(arrows: { orig: string; dest: string; brush: string }[]): DrawShape[] {
  return arrows.map(a => ({ orig: a.orig as cg.Key, dest: a.dest as cg.Key, brush: a.brush }));
}
```

## Common adaptations

- **Flip the board:** `api.set({ orientation })`, or `api.toggleOrientation()`. Re-init only if
  orientation is a creation-time prop you key the effect on (`DuellLiveBoard` does this for `live.color`).
- **Optimistic move + rollback:** show the user's move immediately, send to the server, and on reject
  `api.set({ fen: board.fen(), ... })` back to the engine's truth (`DailyPuzzleBoard`'s pattern).
- **Auto-play an opponent reply:** apply to ffish, then `api.set({ fen, lastMove, ... })`. A short delay
  (~280 ms) before showing the reply reads more naturally than instant.
- **Square-level feedback (flash a square):** don't go through `set()`. Find the node by its stamped
  `cgKey` and toggle a CSS class — see `src/lib/board/moveFeedback.ts`:
  ```ts
  const sq = wrap.querySelector("cg-board")?.querySelectorAll("square");
  // find node where (node as HTMLElement & {cgKey?: string}).cgKey === target, add/remove a class on a timer
  ```
  This is the one sanctioned DOM reach-in — purely visual, never game state.
- **Premoves:** keep `premovable.enabled: true`, and after the opponent's move call `api.playPremove()`
  to execute any queued one (then validate/resolve it like a normal move).
