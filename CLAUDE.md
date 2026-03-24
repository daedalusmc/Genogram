# Genogram - Interactive Family Genogram App

## Quick Start
```
npm run dev
# Opens at http://localhost:5173
```

## Project Overview
Interactive web-based genogram builder for a Feelings School presentation. Built with React 19, TypeScript, React Flow v12, Zustand, Tailwind CSS v4, and Vite.

## Key Files
- `src/components/canvas/GenogramEdge.tsx` — Unified edge component for ALL relationship lines (structural, emotional, child). Handles waypoint routing, drag handles, type menus.
- `src/components/canvas/PersonNode.tsx` — Person node with 8 snap points per shape, dynamic positions based on gender.
- `src/components/canvas/PersonSymbol.tsx` — SVG renderer for all genogram shapes (square, circle, diamond, D-shape, etc.)
- `src/components/canvas/GenogramCanvas.tsx` — Main React Flow canvas. Builds nodes/edges from store, handles connections and drag.
- `src/store/genogramStore.ts` — Zustand store with all state, actions, persistence.
- `src/types/relationship.ts` — EdgeRoute interface (sourceHandle, targetHandle, waypoints).
- `src/types/enums.ts` — All gender, relationship type, condition, and label enums with color maps.
- `src/hooks/useAutoLayout.ts` — Custom hierarchical layout (no dagre).

## Architecture Notes
- **No alias handles** — edges use snap point IDs directly. `resolveSourceHandle()` / `resolveTargetHandle()` in GenogramCanvas handle mapping.
- **Snap points**: 8 per shape, positioned on actual perimeter (circle at 45deg intervals, diamond at vertices). Source type handles use snap ID, target type use `{id}-tgt` suffix.
- **Edge routing**: Polyline through `route.waypoints[]`. Double-click edge for edit mode.
- **Relationship conversion**: `convertToEmotional()` / `convertToStructural()` delete old + create new with same route.
- **Emotional line patterns (zigzag, wavy)**: NOT yet implemented in GenogramEdge — colors and labels work but visual patterns are missing. Old algorithms exist in EmotionalEdge.tsx (unused).

## Dead Files (can be removed)
- `src/components/canvas/StructuralEdge.tsx` — replaced by GenogramEdge
- `src/components/canvas/EmotionalEdge.tsx` — replaced by GenogramEdge
- `src/components/canvas/ChildEdge.tsx` — replaced by GenogramEdge
- `src/components/ui/ToolSelector.tsx` — removed from UI

## GitHub
Private repo: https://github.com/daedalusmc/Genogram
