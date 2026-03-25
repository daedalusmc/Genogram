# Genogram - Interactive Family Genogram App

## Quick Start
```
npm install
npm run dev
# Opens at http://localhost:5173
```

## Project Overview
Interactive web-based genogram builder for a Feelings School presentation. Built with React 19, TypeScript, React Flow v12, Zustand, Tailwind CSS v4, and Vite.

## Key Files
- `src/components/canvas/GenogramEdge.tsx` — Unified edge component for ALL relationship lines (structural, emotional, child). Handles waypoint routing, drag handles, type menus, label dragging.
- `src/components/canvas/PersonNode.tsx` — Person node with 8 snap points per shape, dynamic positions based on gender. Uses `dragHandle='.drag-handle'` to separate node dragging from handle connections.
- `src/components/canvas/PersonSymbol.tsx` — SVG renderer for all genogram shapes (square, circle, diamond, D-shape, inverted triangles for gay/lesbian, etc.). Condition color bands, deceased X (clipped to shape), photos.
- `src/components/canvas/GenogramCanvas.tsx` — Main React Flow canvas. Builds nodes/edges from store, handles snap-to-snap connections, auto layout + edge routing integration.
- `src/components/panels/PersonFormPanel.tsx` — Edit person form (name, gender, DOB, photo, conditions, labels, relationships).
- `src/components/presentation/PresentationMode.tsx` — Presentation mode with keyboard navigation, smart family-cluster centering, detail panel.
- `src/components/presentation/PersonDetailPanel.tsx` — Right-side detail panel showing person info, relationships, conditions, labels, photo.
- `src/store/genogramStore.ts` — Zustand store with all state, actions, persistence to localStorage.
- `src/utils/edgeRouter.ts` — Automatic edge routing: obstacle detection, tiered routing (direct → L-bend → U-bend → A*), smart handle selection.
- `src/hooks/useAutoLayout.ts` — Tree-based hierarchical auto layout (family unit trees, bottom-up width, top-down positioning).
- `src/types/relationship.ts` — EdgeRoute interface (sourceHandle, targetHandle, waypoints, routeIsManual).
- `src/types/enums.ts` — All gender, relationship type, condition, and label enums with color maps.

## Architecture Notes
- **Snap points**: 8 per shape, positioned on actual perimeter. Source handles use snap ID, target handles use `{id}-tgt` suffix. `toSnapId()` strips `-tgt` and resolves aliases.
- **ConnectionMode.Loose**: Users drag from any snap point to any snap point to create relationships. `onConnect` strips `-tgt` from both ends.
- **Edge routing**: Polyline through `route.waypoints[]`. Auto-router runs after Auto Layout via `computeAllEdgeRoutes()`. Manual routes (`routeIsManual: true`) survive auto-layout re-runs.
- **Node dragging**: `dragHandle: '.drag-handle'` restricts node drag to the symbol/name area. Snap point handles have `nodrag nopan` to enable connection drag.
- **Edge click layering**: Edge hit paths use `pointer-events: 'stroke'` (not 'all') so nodes above can receive clicks.
- **Deceased X**: Clipped to shape via `<g clipPath>` using GenderClipPath.
- **Dark/light theme**: CSS variables in `:root` / `[data-theme="dark"]`, toggled via store.
- **Presentation mode**: Arrow keys navigate persons, detail panel slides in on right, camera centers on family cluster accounting for panel width.
- **Batch edge routes**: `batchUpdateEdgeRoutes()` applies all route changes in one render.

## Disabled Features (no UI toggle yet — code preserved as comments)
- Recovery arrow overlay on condition bands (`inRecovery`)
- Suspected condition opacity (`suspected`)
- Pregnancy shapes (triangle variants)
- Emotional line visual patterns (zigzag, wavy) — colors and labels work

## Dead Files (can be removed)
- `src/components/canvas/StructuralEdge.tsx` — replaced by GenogramEdge
- `src/components/canvas/EmotionalEdge.tsx` — replaced by GenogramEdge (has old zigzag/wavy algorithms)
- `src/components/canvas/ChildEdge.tsx` — replaced by GenogramEdge
- `src/components/ui/ToolSelector.tsx` — removed from UI

## GitHub
Private repo: https://github.com/daedalusmc/Genogram
