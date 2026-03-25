/**
 * Edge Router — automatic orthogonal edge routing that avoids node obstacles.
 *
 * Runs as a post-processing step after Auto Layout positions nodes.
 * Produces waypoint arrays that plug into the existing updateEdgeRoute system.
 */

import type { StructuralRelationship, EmotionalRelationship, EdgeRoute } from '../types/relationship'

// ── Types ──

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

interface RouteResult {
  structural: Record<string, Partial<EdgeRoute>>
  emotional: Record<string, Partial<EdgeRoute>>
}

// ── Constants ──

const OBSTACLE_PAD = 20      // padding around node bounding boxes
const NODE_VIS_W = 80        // visual width of the shape area
const NODE_VIS_H = 85        // shape + name label height
const NODE_OFFSET_X = 20     // x offset from node pos to visual area
const NODE_OFFSET_Y = -5     // y offset from node pos to visual area
const GRID_CELL = 20         // A* grid resolution
const MARGIN = 60            // margin around the routing area
const MAX_A_STAR_ITER = 5000 // safety limit for A*

// Handle positions relative to node top-left (must match GenogramCanvas HANDLE_POS)
const HANDLE_POS: Record<string, Point> = {
  'top-center': { x: 60, y: 4 },
  'top-left': { x: 34, y: 4 },
  'top-right': { x: 86, y: 4 },
  'bottom-center': { x: 60, y: 56 },
  'bottom-left': { x: 34, y: 56 },
  'bottom-right': { x: 86, y: 56 },
  'left-center': { x: 34, y: 30 },
  'right-center': { x: 86, y: 30 },
}

// All handle IDs for iteration
const ALL_HANDLES = Object.keys(HANDLE_POS)

// ── Geometry Utilities ──

function rectContains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
}

/** Check if a line segment from p1 to p2 intersects a rectangle */
function segmentIntersectsRect(p1: Point, p2: Point, r: Rect): boolean {
  // Check if either endpoint is inside the rect
  if (rectContains(r, p1) || rectContains(r, p2)) return true

  // Check segment against all 4 rect edges
  const corners = [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ]

  for (let i = 0; i < 4; i++) {
    const c1 = corners[i]
    const c2 = corners[(i + 1) % 4]
    if (segmentsIntersect(p1, p2, c1, c2)) return true
  }

  return false
}

/** Check if two line segments intersect */
function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const d1 = cross(b1, b2, a1)
  const d2 = cross(b1, b2, a2)
  const d3 = cross(a1, a2, b1)
  const d4 = cross(a1, a2, b2)

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }

  // Collinear cases
  if (d1 === 0 && onSegment(b1, b2, a1)) return true
  if (d2 === 0 && onSegment(b1, b2, a2)) return true
  if (d3 === 0 && onSegment(a1, a2, b1)) return true
  if (d4 === 0 && onSegment(a1, a2, b2)) return true

  return false
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

function onSegment(p: Point, q: Point, r: Point): boolean {
  return r.x >= Math.min(p.x, q.x) && r.x <= Math.max(p.x, q.x) &&
         r.y >= Math.min(p.y, q.y) && r.y <= Math.max(p.y, q.y)
}

/** Check if a polyline (sequence of points) intersects any obstacle */
function pathIntersectsAny(points: Point[], obstacles: Rect[]): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    for (const obs of obstacles) {
      if (segmentIntersectsRect(points[i], points[i + 1], obs)) return true
    }
  }
  return false
}

function dist(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)  // Manhattan distance
}

// ── Obstacle Map ──

function buildObstacles(
  nodePositions: Record<string, Point>,
  excludeIds: Set<string>,
): Rect[] {
  const obstacles: Rect[] = []
  for (const [id, pos] of Object.entries(nodePositions)) {
    if (excludeIds.has(id)) continue
    obstacles.push({
      x: pos.x + NODE_OFFSET_X - OBSTACLE_PAD,
      y: pos.y + NODE_OFFSET_Y - OBSTACLE_PAD,
      w: NODE_VIS_W + OBSTACLE_PAD * 2,
      h: NODE_VIS_H + OBSTACLE_PAD * 2,
    })
  }
  return obstacles
}

// ── Tiered Edge Routing ──

/** Try direct line, then L-bend, U-bend, finally A* */
function routeEdge(src: Point, tgt: Point, obstacles: Rect[]): Point[] {
  // Tier 1: Direct — straight line
  if (!pathIntersectsAny([src, tgt], obstacles)) {
    return []  // no waypoints needed
  }

  // Tier 2: L-bend — one waypoint, two segments
  // Try horizontal-first
  const lBend1: Point = { x: tgt.x, y: src.y }
  if (!pathIntersectsAny([src, lBend1, tgt], obstacles)) {
    return [lBend1]
  }
  // Try vertical-first
  const lBend2: Point = { x: src.x, y: tgt.y }
  if (!pathIntersectsAny([src, lBend2, tgt], obstacles)) {
    return [lBend2]
  }

  // Tier 3: U-bend — two waypoints
  // Try several offset amounts
  const offsets = [60, 100, 140, -60, -100, -140]
  for (const off of offsets) {
    // Horizontal U: go right/left, then vertical, then back
    const u1: Point = { x: src.x + off, y: src.y }
    const u2: Point = { x: src.x + off, y: tgt.y }
    if (!pathIntersectsAny([src, u1, u2, tgt], obstacles)) {
      return [u1, u2]
    }
    // Vertical U: go down/up, then horizontal, then back
    const v1: Point = { x: src.x, y: src.y + off }
    const v2: Point = { x: tgt.x, y: src.y + off }
    if (!pathIntersectsAny([src, v1, v2, tgt], obstacles)) {
      return [v1, v2]
    }
  }

  // Tier 4: A* grid pathfinding
  return aStarRoute(src, tgt, obstacles)
}

// ── A* Grid Pathfinding ──

function aStarRoute(src: Point, tgt: Point, obstacles: Rect[]): Point[] {
  // Compute grid bounds
  const allPoints = [src, tgt]
  for (const obs of obstacles) {
    allPoints.push({ x: obs.x, y: obs.y })
    allPoints.push({ x: obs.x + obs.w, y: obs.y + obs.h })
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of allPoints) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }

  minX -= MARGIN
  minY -= MARGIN
  maxX += MARGIN
  maxY += MARGIN

  const gridW = Math.ceil((maxX - minX) / GRID_CELL) + 1
  const gridH = Math.ceil((maxY - minY) / GRID_CELL) + 1

  // Safety check for very large grids
  if (gridW * gridH > 50000) {
    // Fallback: just return a simple L-bend even if it crosses
    return [{ x: tgt.x, y: src.y }]
  }

  // Build blocked grid
  const blocked = new Uint8Array(gridW * gridH)
  for (const obs of obstacles) {
    const gx1 = Math.floor((obs.x - minX) / GRID_CELL)
    const gy1 = Math.floor((obs.y - minY) / GRID_CELL)
    const gx2 = Math.ceil((obs.x + obs.w - minX) / GRID_CELL)
    const gy2 = Math.ceil((obs.y + obs.h - minY) / GRID_CELL)
    for (let gy = Math.max(0, gy1); gy <= Math.min(gridH - 1, gy2); gy++) {
      for (let gx = Math.max(0, gx1); gx <= Math.min(gridW - 1, gx2); gx++) {
        blocked[gy * gridW + gx] = 1
      }
    }
  }

  // Convert src/tgt to grid coords
  const startGx = Math.round((src.x - minX) / GRID_CELL)
  const startGy = Math.round((src.y - minY) / GRID_CELL)
  const endGx = Math.round((tgt.x - minX) / GRID_CELL)
  const endGy = Math.round((tgt.y - minY) / GRID_CELL)

  // Ensure start/end are not blocked
  blocked[startGy * gridW + startGx] = 0
  blocked[endGy * gridW + endGx] = 0

  // A* with Manhattan heuristic, 4-directional
  const key = (gx: number, gy: number) => gy * gridW + gx
  const startKey = key(startGx, startGy)
  const endKey = key(endGx, endGy)

  const gCost = new Map<number, number>()
  const fCost = new Map<number, number>()
  const cameFrom = new Map<number, number>()

  gCost.set(startKey, 0)
  fCost.set(startKey, Math.abs(endGx - startGx) + Math.abs(endGy - startGy))

  // Simple priority queue using sorted array (fast enough for our grid sizes)
  const openSet = [startKey]
  const inOpen = new Set<number>([startKey])

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  let iterations = 0

  while (openSet.length > 0 && iterations < MAX_A_STAR_ITER) {
    iterations++

    // Find node with lowest fCost
    let bestIdx = 0
    let bestF = fCost.get(openSet[0]) ?? Infinity
    for (let i = 1; i < openSet.length; i++) {
      const f = fCost.get(openSet[i]) ?? Infinity
      if (f < bestF) {
        bestF = f
        bestIdx = i
      }
    }

    const current = openSet[bestIdx]
    openSet.splice(bestIdx, 1)
    inOpen.delete(current)

    if (current === endKey) {
      // Reconstruct path
      const gridPath: number[] = [endKey]
      let c = endKey
      while (cameFrom.has(c)) {
        c = cameFrom.get(c)!
        gridPath.unshift(c)
      }

      // Convert grid coords back to world coords
      const worldPath = gridPath.map((k) => ({
        x: (k % gridW) * GRID_CELL + minX,
        y: Math.floor(k / gridW) * GRID_CELL + minY,
      }))

      // Simplify: remove collinear points
      return simplifyPath(worldPath)
    }

    const cx = current % gridW
    const cy = Math.floor(current / gridW)

    for (const [dx, dy] of dirs) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue
      const nKey = key(nx, ny)
      if (blocked[nKey]) continue

      const tentG = (gCost.get(current) ?? Infinity) + 1
      if (tentG < (gCost.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, current)
        gCost.set(nKey, tentG)
        fCost.set(nKey, tentG + Math.abs(endGx - nx) + Math.abs(endGy - ny))
        if (!inOpen.has(nKey)) {
          openSet.push(nKey)
          inOpen.add(nKey)
        }
      }
    }
  }

  // A* failed — fallback to simple L-bend
  return [{ x: tgt.x, y: src.y }]
}

/** Remove collinear intermediate points from an orthogonal path */
function simplifyPath(path: Point[]): Point[] {
  if (path.length <= 2) return path.slice(1, -1) // strip start/end (those are source/target)

  const simplified: Point[] = []
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1]
    const curr = path[i]
    const next = path[i + 1]

    // Keep point if direction changes
    const sameX = prev.x === curr.x && curr.x === next.x
    const sameY = prev.y === curr.y && curr.y === next.y
    if (!sameX && !sameY) {
      simplified.push(curr)
    }
  }

  return simplified
}

// ── Smart Handle Selection ──

function pickEmotionalHandles(
  sourcePos: Point,
  targetPos: Point,
  usedSourceHandles: Set<string>,
  usedTargetHandles: Set<string>,
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x
  const dy = targetPos.y - sourcePos.y
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  let srcCandidates: string[]
  let tgtCandidates: string[]

  if (absDx > absDy * 1.5) {
    // Primarily horizontal
    if (dx > 0) {
      srcCandidates = ['right-center', 'top-right', 'bottom-right']
      tgtCandidates = ['left-center', 'top-left', 'bottom-left']
    } else {
      srcCandidates = ['left-center', 'top-left', 'bottom-left']
      tgtCandidates = ['right-center', 'top-right', 'bottom-right']
    }
  } else if (absDy > absDx * 1.5) {
    // Primarily vertical
    if (dy > 0) {
      srcCandidates = ['bottom-center', 'bottom-left', 'bottom-right']
      tgtCandidates = ['top-center', 'top-left', 'top-right']
    } else {
      srcCandidates = ['top-center', 'top-left', 'top-right']
      tgtCandidates = ['bottom-center', 'bottom-left', 'bottom-right']
    }
  } else {
    // Diagonal
    if (dx > 0 && dy > 0) {
      srcCandidates = ['bottom-right', 'right-center', 'bottom-center']
      tgtCandidates = ['top-left', 'left-center', 'top-center']
    } else if (dx > 0 && dy < 0) {
      srcCandidates = ['top-right', 'right-center', 'top-center']
      tgtCandidates = ['bottom-left', 'left-center', 'bottom-center']
    } else if (dx < 0 && dy > 0) {
      srcCandidates = ['bottom-left', 'left-center', 'bottom-center']
      tgtCandidates = ['top-right', 'right-center', 'top-center']
    } else {
      srcCandidates = ['top-left', 'left-center', 'top-center']
      tgtCandidates = ['bottom-right', 'right-center', 'bottom-center']
    }
  }

  // Pick first unused handle
  const srcHandle = srcCandidates.find((h) => !usedSourceHandles.has(h)) || srcCandidates[0]
  const tgtHandle = tgtCandidates.find((h) => !usedTargetHandles.has(h)) || tgtCandidates[0]

  usedSourceHandles.add(srcHandle)
  usedTargetHandles.add(tgtHandle)

  return { sourceHandle: srcHandle, targetHandle: tgtHandle }
}

// ── Main Entry Point ──

export function computeAllEdgeRoutes(
  nodePositions: Record<string, Point>,
  structuralRels: Record<string, StructuralRelationship>,
  emotionalRels: Record<string, EmotionalRelationship>,
): RouteResult {
  const result: RouteResult = { structural: {}, emotional: {} }

  // Track used handles per node (for emotional handle conflict avoidance)
  const usedSrcHandles = new Map<string, Set<string>>()
  const usedTgtHandles = new Map<string, Set<string>>()

  const getUsedSrc = (id: string) => {
    if (!usedSrcHandles.has(id)) usedSrcHandles.set(id, new Set())
    return usedSrcHandles.get(id)!
  }
  const getUsedTgt = (id: string) => {
    if (!usedTgtHandles.has(id)) usedTgtHandles.set(id, new Set())
    return usedTgtHandles.get(id)!
  }

  // ── Route structural edges ──
  // Structural edges are typically horizontal between side-by-side partners
  // They usually don't need routing (direct line), but verify

  for (const rel of Object.values(structuralRels)) {
    if (rel.route?.routeIsManual) continue  // skip manually routed edges

    const p1 = nodePositions[rel.person1Id]
    const p2 = nodePositions[rel.person2Id]
    if (!p1 || !p2) continue

    const srcHandle = rel.route?.sourceHandle || 'right-center'
    const tgtHandle = rel.route?.targetHandle || 'left-center'

    const srcPt = {
      x: p1.x + (HANDLE_POS[srcHandle]?.x ?? 86),
      y: p1.y + (HANDLE_POS[srcHandle]?.y ?? 30),
    }
    const tgtPt = {
      x: p2.x + (HANDLE_POS[tgtHandle]?.x ?? 34),
      y: p2.y + (HANDLE_POS[tgtHandle]?.y ?? 30),
    }

    const excludeIds = new Set([rel.person1Id, rel.person2Id])
    // Also exclude children (their nodes are below, not obstacles for the couple line)
    for (const child of rel.children) {
      excludeIds.add(child.childId)
    }

    const obstacles = buildObstacles(nodePositions, excludeIds)
    const waypoints = routeEdge(srcPt, tgtPt, obstacles)

    result.structural[rel.id] = {
      sourceHandle: srcHandle,
      targetHandle: tgtHandle,
      waypoints,
    }

    // Mark handles as used
    getUsedSrc(rel.person1Id).add(srcHandle)
    getUsedTgt(rel.person2Id).add(tgtHandle)
  }

  // ── Route emotional edges ──
  // These connect any two nodes and benefit most from smart routing

  for (const rel of Object.values(emotionalRels)) {
    if (rel.route?.routeIsManual) continue

    const p1 = nodePositions[rel.person1Id]
    const p2 = nodePositions[rel.person2Id]
    if (!p1 || !p2) continue

    // Smart handle selection
    const { sourceHandle, targetHandle } = pickEmotionalHandles(
      { x: p1.x + 60, y: p1.y + 30 },  // node centers
      { x: p2.x + 60, y: p2.y + 30 },
      getUsedSrc(rel.person1Id),
      getUsedTgt(rel.person2Id),
    )

    const srcPt = {
      x: p1.x + (HANDLE_POS[sourceHandle]?.x ?? 60),
      y: p1.y + (HANDLE_POS[sourceHandle]?.y ?? 4),
    }
    const tgtPt = {
      x: p2.x + (HANDLE_POS[targetHandle]?.x ?? 60),
      y: p2.y + (HANDLE_POS[targetHandle]?.y ?? 56),
    }

    const excludeIds = new Set([rel.person1Id, rel.person2Id])
    const obstacles = buildObstacles(nodePositions, excludeIds)
    const waypoints = routeEdge(srcPt, tgtPt, obstacles)

    result.emotional[rel.id] = {
      sourceHandle,
      targetHandle,
      waypoints,
    }
  }

  return result
}

// ── Exported utilities for crossing detection (Phase 5) ──

export { segmentsIntersect, type Point as EdgePoint }
