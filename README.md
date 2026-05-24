# Genogram

An interactive web app for building and presenting family genograms — the structured family diagrams used in therapy, social work, medicine, and family-systems education to map relationships, health patterns, and emotional dynamics across generations.

Built originally to support a Feelings School presentation; now open source.

## Features

- **9 gender symbols** with 8 snap points each on the actual shape perimeter
  (square, circle, diamond, D-shape, inverted triangles, etc.)
- **12+ structural relationship types** (marriage, divorce, cohabitation,
  engagement, widowed, casual, love affair, …) with the conventional slash
  marks and dash patterns
- **29 emotional relationship types** with the standard genogram visual
  vocabulary — zigzag for conflict/hostility, wavy for violence/abuse,
  parallel lines for closeness/fusion, arrows for directed dynamics
- **Per-marriage child picker** so half-siblings and step-families attach to
  the right T-junction (no order-dependency)
- **Health condition color bands** (10+ conditions: depression, alcoholism,
  cancer, etc.) clipped to the person's shape
- **Photos**, **labels**, and **notes** on every person
- **Auto Layout** — tree-based hierarchical placement for family unit trees,
  with cross-branch marriages handled correctly
- **Auto edge routing** with obstacle avoidance (direct → L-bend → U-bend →
  A* pathfinding) so lines don't cross through nodes
- **Presentation mode** — keyboard-navigable, with a detail panel and smart
  family-cluster centering
- **Dark and light themes**
- **JSON export/import** for sharing genograms
- **Auto-save** to localStorage

## Quick Start

```bash
npm install
npm run dev
```

Opens at <http://localhost:5173>.

## Build

```bash
npm run build
npm run preview
```

## Tech Stack

- React 19 + TypeScript
- [@xyflow/react](https://reactflow.dev/) (React Flow v12) for the canvas
- [Zustand](https://github.com/pmndrs/zustand) for state
- Tailwind CSS v4
- Vite

## How relationships connect

Drag from any snap point on one person to any snap point on another to
create a relationship. Every new line starts as a Marriage by default —
click the line and pick a different type (Familial or Emotional) from the
menu. The snap point picker on the same menu lets you choose exactly which
side of each shape the line attaches to.

To add a child, open one of the parents' edit panel and click the
"+ Add Child with [partner]" button for the specific family unit. Then click
the child on the canvas — it attaches as a T-junction from that couple's
line.

## License

[MIT](LICENSE) © Michael Cousin
