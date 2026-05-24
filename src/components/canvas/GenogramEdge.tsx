import { useState, useCallback, useRef } from 'react'
import type { EdgeProps, Edge } from '@xyflow/react'
import { useReactFlow } from '@xyflow/react'
import { EMOTIONAL_EDGE_STYLES } from '../../constants/relationshipStyles'
import {
  StructuralRelType, STRUCTURAL_REL_LABELS,
  EmotionalRelType, EMOTIONAL_REL_LABELS,
} from '../../types/enums'
import { useGenogramStore } from '../../store/genogramStore'
import { EdgeMenu } from '../ui/EdgeMenu'

const SNAP = 20
function snap(v: number): number { return Math.round(v / SNAP) * SNAP }

type Pt = { x: number; y: number }

function polylineLength(points: Pt[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return total
}

// Position and local direction at distance d along the polyline.
function pointAlongPolyline(points: Pt[], d: number): { x: number; y: number; dx: number; dy: number } {
  let traveled = 0
  for (let i = 1; i < points.length; i++) {
    const ax = points[i - 1].x, ay = points[i - 1].y
    const bx = points[i].x, by = points[i].y
    const segLen = Math.hypot(bx - ax, by - ay)
    if (traveled + segLen >= d) {
      const t = segLen === 0 ? 0 : (d - traveled) / segLen
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, dx: bx - ax, dy: by - ay }
    }
    traveled += segLen
  }
  const last = points[points.length - 1]
  const prev = points[points.length - 2] || last
  return { x: last.x, y: last.y, dx: last.x - prev.x, dy: last.y - prev.y }
}

const straightPath = (points: Pt[]): string =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

// Triangular zigzag along an arbitrary polyline. Used for conflict/hostile.
function buildZigzagPath(points: Pt[], amplitude: number, segmentLen: number, baseOffset = 0): string {
  if (points.length < 2) return ''
  const total = polylineLength(points)
  if (total < segmentLen * 2) return straightPath(points)
  const segments = Math.max(4, Math.round(total / segmentLen))
  const out: string[] = []
  for (let i = 0; i <= segments; i++) {
    const d = (i / segments) * total
    const { x, y, dx, dy } = pointAlongPolyline(points, d)
    const len = Math.hypot(dx, dy) || 1
    const perpX = -dy / len, perpY = dx / len
    const sign = i % 2 === 0 ? 1 : -1
    const amp = i === 0 || i === segments ? 0 : amplitude * sign
    const off = amp + baseOffset
    out.push(`${i === 0 ? 'M' : 'L'} ${x + perpX * off} ${y + perpY * off}`)
  }
  return out.join(' ')
}

// Smooth sinusoidal wave along an arbitrary polyline. Used for violence/abuse.
function buildWavyPath(points: Pt[], amplitude: number, wavelength: number, baseOffset = 0): string {
  if (points.length < 2) return ''
  const total = polylineLength(points)
  if (total < wavelength) return straightPath(points)
  const samples = Math.max(20, Math.round(total / (wavelength / 4)))
  const out: string[] = []
  for (let i = 0; i <= samples; i++) {
    const d = (i / samples) * total
    const { x, y, dx, dy } = pointAlongPolyline(points, d)
    const len = Math.hypot(dx, dy) || 1
    const perpX = -dy / len, perpY = dx / len
    // Envelope tapers the wave to zero at the endpoints.
    const t = i / samples
    const envelope = Math.min(1, Math.min(t, 1 - t) * 8)
    const wave = Math.sin((d / wavelength) * Math.PI * 2) * amplitude * envelope
    const off = wave + baseOffset
    out.push(`${i === 0 ? 'M' : 'L'} ${x + perpX * off} ${y + perpY * off}`)
  }
  return out.join(' ')
}

export type GenogramEdgeData = {
  edgeKind: 'structural' | 'emotional' | 'child'
  relId: string
  relType: string
  // Structural-specific
  startDate?: string | null
  endDate?: string | null
  slashes?: number
  strokeDasharray?: string
  // Emotional-specific
  isDirected?: boolean
  stroke?: string
  strokeWidth?: number
  pattern?: string
  lineCount?: number
  markerEnd?: boolean
  label?: string
  // Child-specific
  connectionType?: string
  coupleLineY?: number
  coupleMidX?: number
  attachmentT?: number
  // Route
  waypoints: Array<{ x: number; y: number }>
  labelOffset?: { x: number; y: number }
}

type GenogramEdgeType = Edge<GenogramEdgeData, 'genogram'>

export function GenogramEdge({
  id, sourceX, sourceY, targetX, targetY,
  data, selected,
}: EdgeProps<GenogramEdgeType>) {
  const [showMenu, setShowMenu] = useState(false)
  const { getViewport } = useReactFlow()
  const updateEdgeRoute = useGenogramStore((s) => s.updateEdgeRoute)

  if (!data) return null

  const kind = data.edgeKind
  const waypoints = data.waypoints || []
  const strokeColor = selected ? 'var(--accent, #3b82f6)' : (data.stroke || 'var(--edge-color, #475569)')

  // Build the full point list: source → waypoints → target
  // For child edges, skip the source point (parent shape) — the line should
  // visually start from the couple line (waypoints[0]), not from a parent's shape
  const isChildWithWaypoints = kind === 'child' && waypoints.length > 0
  const allPoints: Array<{ x: number; y: number }> = isChildWithWaypoints
    ? [...waypoints, { x: targetX, y: targetY }]
    : [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }]

  // Straight polyline through all points (used for hit area and as fallback).
  const pathD = straightPath(allPoints)

  // Pattern-decorated visible path. For zigzag/wavy/double-wavy we draw the
  // shaped path instead of a straight line; the hit area stays straight so
  // clicks land predictably.
  const pattern = data.pattern
  const visiblePath =
    pattern === 'zigzag' ? buildZigzagPath(allPoints, 5, 12) :
    pattern === 'wavy' ? buildWavyPath(allPoints, 4, 14) :
    pattern === 'double-wavy' ? buildWavyPath(allPoints, 4, 14) :
    pathD

  // Compute segment midpoints for inserting new waypoints
  const segmentMids = allPoints.slice(0, -1).map((p, i) => ({
    x: (p.x + allPoints[i + 1].x) / 2,
    y: (p.y + allPoints[i + 1].y) / 2,
    afterIndex: i, // insert new waypoint after allPoints[i]
  }))

  // Label position (midpoint of entire path)
  const midIdx = Math.floor(allPoints.length / 2)
  const labelX = allPoints.length % 2 === 0
    ? (allPoints[midIdx - 1].x + allPoints[midIdx].x) / 2
    : allPoints[midIdx].x
  const labelY = allPoints.length % 2 === 0
    ? (allPoints[midIdx - 1].y + allPoints[midIdx].y) / 2
    : allPoints[midIdx].y

  // Determine line style
  const dashArray = data.strokeDasharray || undefined
  const lineWidth = data.strokeWidth || 2
  const label = data.label || ''

  // Label offset from store (user-dragged position)
  const labelOffsetX = data.labelOffset?.x || 0
  const labelOffsetY = data.labelOffset?.y || 0
  const finalLabelX = labelX + labelOffsetX
  const finalLabelY = labelY + labelOffsetY

  // Arrow marker for directed emotional edges
  const markerId = data.isDirected && data.markerEnd ? `arrow-${id}` : undefined

  // ── Unified line interaction: click = menu, drag = bend ──
  const DRAG_THRESHOLD = 5
  const lineDragRef = useRef<{
    startX: number; startY: number
    isDragging: boolean
    wpIndex: number  // index into waypoints array for the new/existing point
    origX: number; origY: number
  } | null>(null)

  // Find which segment of allPoints was clicked (closest to click point)
  const findSegment = useCallback((clientX: number, clientY: number) => {
    const { x: panX, y: panY, zoom } = getViewport()
    const flowX = (clientX - panX) / zoom
    const flowY = (clientY - panY) / zoom

    let bestDist = Infinity
    let bestIdx = 0
    let bestProjX = flowX
    let bestProjY = flowY

    for (let i = 0; i < allPoints.length - 1; i++) {
      const ax = allPoints[i].x, ay = allPoints[i].y
      const bx = allPoints[i + 1].x, by = allPoints[i + 1].y
      const dx = bx - ax, dy = by - ay
      const len2 = dx * dx + dy * dy
      let t = len2 === 0 ? 0 : ((flowX - ax) * dx + (flowY - ay) * dy) / len2
      t = Math.max(0, Math.min(1, t))
      const px = ax + t * dx, py = ay + t * dy
      const dist = Math.hypot(flowX - px, flowY - py)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i  // segment index in allPoints (0 = before first waypoint)
        bestProjX = px
        bestProjY = py
      }
    }
    // Convert allPoints segment index to waypoints insertion index
    // Normal edges: allPoints[0]=source, so segment i → insert at waypoints[i]
    // Child edges: allPoints[0]=waypoints[0] (source skipped), so segment i → insert at waypoints[i+1]
    const wpInsertIdx = isChildWithWaypoints ? bestIdx + 1 : bestIdx
    return { segIdx: wpInsertIdx, projX: bestProjX, projY: bestProjY }
  }, [allPoints, getViewport, isChildWithWaypoints])

  // Pointer down on the line hit area — could be click or drag
  const onLinePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const { segIdx, projX, projY } = findSegment(startX, startY)

    lineDragRef.current = {
      startX, startY,
      isDragging: false,
      wpIndex: segIdx,  // will insert at this index in waypoints
      origX: snap(projX),
      origY: snap(projY),
    }

    const relId = data.relId
    const edgeKind = kind

    const onMove = (me: PointerEvent) => {
      if (!lineDragRef.current) return
      const dist = Math.hypot(me.clientX - lineDragRef.current.startX, me.clientY - lineDragRef.current.startY)

      if (!lineDragRef.current.isDragging && dist > DRAG_THRESHOLD) {
        // Crossed threshold — insert waypoint and start dragging
        lineDragRef.current.isDragging = true
        const insertIdx = lineDragRef.current.wpIndex
        const state = useGenogramStore.getState()
        const rel = (edgeKind === 'structural' || edgeKind === 'child')
          ? state.structuralRelationships[relId]
          : state.emotionalRelationships[relId]
        if (!rel) return
        const newWp = [...rel.route.waypoints]
        newWp.splice(insertIdx, 0, { x: lineDragRef.current.origX, y: lineDragRef.current.origY })
        updateEdgeRoute(edgeKind === 'child' ? 'structural' : edgeKind, relId, { waypoints: newWp, routeIsManual: true })
      }

      if (lineDragRef.current.isDragging) {
        const zoom = getViewport().zoom
        const dx = (me.clientX - lineDragRef.current.startX) / zoom
        const dy = (me.clientY - lineDragRef.current.startY) / zoom
        const state = useGenogramStore.getState()
        const rel = (edgeKind === 'structural' || edgeKind === 'child')
          ? state.structuralRelationships[relId]
          : state.emotionalRelationships[relId]
        if (!rel) return
        const currentWp = [...rel.route.waypoints]
        const idx = lineDragRef.current.wpIndex
        if (currentWp[idx]) {
          currentWp[idx] = {
            x: snap(lineDragRef.current.origX + dx),
            y: snap(lineDragRef.current.origY + dy),
          }
          updateEdgeRoute(edgeKind === 'child' ? 'structural' : edgeKind, relId, { waypoints: currentWp })
        }
      }
    }

    const onUp = () => {
      const wasDragging = lineDragRef.current?.isDragging || false
      lineDragRef.current = null
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      // If it wasn't a drag, treat as click → open menu
      if (!wasDragging) {
        setShowMenu((prev) => !prev)
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [data.relId, kind, findSegment, getViewport, updateEdgeRoute, setShowMenu])

  // Drag an existing waypoint
  const onWaypointPointerDown = useCallback((wpIndex: number, e: React.PointerEvent) => {
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const wp = waypoints[wpIndex]
    const origX = wp.x
    const origY = wp.y
    const relId = data.relId
    const edgeKind = kind

    const onMove = (me: PointerEvent) => {
      const zoom = getViewport().zoom
      const dx = (me.clientX - startX) / zoom
      const dy = (me.clientY - startY) / zoom
      const state = useGenogramStore.getState()
      const rel = (edgeKind === 'structural' || edgeKind === 'child')
        ? state.structuralRelationships[relId]
        : state.emotionalRelationships[relId]
      if (!rel) return
      const currentWp = [...rel.route.waypoints]
      if (currentWp[wpIndex]) {
        currentWp[wpIndex] = { x: snap(origX + dx), y: snap(origY + dy) }
        updateEdgeRoute(edgeKind === 'child' ? 'structural' : edgeKind, relId, { waypoints: currentWp })
      }
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [waypoints, data.relId, kind, getViewport, updateEdgeRoute])

  // Right-click a waypoint to delete it
  const onWaypointContextMenu = useCallback((wpIndex: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const state = useGenogramStore.getState()
    const edgeKind = kind
    const relId = data.relId
    const rel = (edgeKind === 'structural' || edgeKind === 'child')
      ? state.structuralRelationships[relId]
      : state.emotionalRelationships[relId]
    if (!rel) return
    const newWp = [...rel.route.waypoints]
    newWp.splice(wpIndex, 1)
    updateEdgeRoute(edgeKind === 'child' ? 'structural' : edgeKind, relId, { waypoints: newWp })
  }, [data.relId, kind, updateEdgeRoute])

  // Drag the label to reposition it
  const labelDragRef = useRef<{ startX: number; startY: number; origOffX: number; origOffY: number } | null>(null)

  const onLabelPointerDown = useCallback((e: React.PointerEvent) => {
    // Stop React Flow from panning
    e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    const origOffX = labelOffsetX
    const origOffY = labelOffsetY
    const relId = data.relId
    const edgeKind = kind

    labelDragRef.current = { startX, startY, origOffX, origOffY }

    const onMove = (me: PointerEvent) => {
      me.preventDefault()
      const zoom = getViewport().zoom
      const dx = (me.clientX - startX) / zoom
      const dy = (me.clientY - startY) / zoom
      updateEdgeRoute(edgeKind === 'child' ? 'structural' : edgeKind, relId, {
        labelOffset: {
          x: snap(origOffX + dx),
          y: snap(origOffY + dy),
        },
      })
    }

    const onUp = () => {
      labelDragRef.current = null
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [labelOffsetX, labelOffsetY, data.relId, kind, getViewport, updateEdgeRoute])

  // Render structural-specific decorations
  const renderStructuralDecorations = () => {
    if (kind !== 'structural') return null
    const slashes = data.slashes || 0
    const midX = finalLabelX
    const midY = finalLabelY

    return (
      <>
        {slashes > 0 && Array.from({ length: slashes }).map((_, i) => {
          const offset = slashes === 1 ? 0 : (i - 0.5) * 8
          return (
            <line key={`slash-${i}`}
              x1={midX + offset - 4} y1={midY - 8}
              x2={midX + offset + 4} y2={midY + 8}
              stroke={strokeColor} strokeWidth={2} style={{ pointerEvents: 'none' }} />
          )
        })}
        {data.relType === 'widowed' && (
          <g style={{ pointerEvents: 'none' }}>
            <line x1={midX - 5} y1={midY - 5} x2={midX + 5} y2={midY + 5} stroke={strokeColor} strokeWidth={2} />
            <line x1={midX + 5} y1={midY - 5} x2={midX - 5} y2={midY + 5} stroke={strokeColor} strokeWidth={2} />
          </g>
        )}
      </>
    )
  }

  // Render extra parallel lines for multi-line emotional edges (close, fused, etc.)
  // The main visible path is at offset 0; extras are placed symmetrically around it.
  // Pattern (zigzag/wavy) propagates so close-hostile renders parallel zigzags.
  const renderMultiLine = () => {
    const count = data.lineCount || 1
    if (count <= 1) return null
    // Wider spacing for patterned lines so adjacent zigzags don't overlap.
    const spacing = pattern ? 6 : 3
    const offsets: number[] =
      count === 2 ? [spacing] :
      count === 3 ? [-spacing, spacing] :
      []
    return offsets.map((offset, i) => {
      const offsetPath =
        pattern === 'zigzag' ? buildZigzagPath(allPoints, 5, 12, offset) :
        pattern === 'wavy' || pattern === 'double-wavy' ? buildWavyPath(allPoints, 4, 14, offset) :
        // Plain parallel polyline: shift each point along the average perpendicular.
        (() => {
          const dx = targetX - sourceX
          const dy = targetY - sourceY
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          const nx = -dy / len * offset
          const ny = dx / len * offset
          return allPoints.map((p, j) =>
            `${j === 0 ? 'M' : 'L'} ${p.x + nx} ${p.y + ny}`
          ).join(' ')
        })()
      return (
        <path key={`multi-${i}`} d={offsetPath} fill="none"
          stroke={strokeColor} strokeWidth={lineWidth}
          strokeDasharray={dashArray} style={{ pointerEvents: 'none' }} />
      )
    })
  }

  return (
    <g>
      {/* Arrow marker definition */}
      {markerId && (
        <defs>
          <marker id={markerId} markerWidth={10} markerHeight={8} refX={9} refY={4} orient="auto">
            <path d="M0,0 L10,4 L0,8 Z" fill={strokeColor} />
          </marker>
        </defs>
      )}

      {/* Invisible drag/click hit area — stroke only, so nodes rendered above can receive clicks */}
      <path d={pathD} fill="none" stroke="transparent" strokeWidth={18}
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onPointerDown={onLinePointerDown} />

      {/* Main visible path — straight, zigzag, or wavy depending on data.pattern */}
      <path d={visiblePath} fill="none" stroke={strokeColor} strokeWidth={lineWidth}
        strokeDasharray={dashArray}
        markerEnd={markerId ? `url(#${markerId})` : undefined}
        style={{ pointerEvents: 'none' }} />

      {/* Second wave for double-wavy (sexual abuse) — offset perpendicular */}
      {pattern === 'double-wavy' && (
        <path d={buildWavyPath(allPoints, 4, 14, 4)} fill="none"
          stroke={strokeColor} strokeWidth={lineWidth}
          markerEnd={markerId ? `url(#${markerId})` : undefined}
          style={{ pointerEvents: 'none' }} />
      )}

      {/* Extra parallel lines for multi-line emotional edges */}
      {renderMultiLine()}

      {/* Structural decorations (slashes, widowed X) */}
      {renderStructuralDecorations()}

      {/* Waypoint handles — visible only when edge is selected */}
      {waypoints.map((wp, i) => (
        <g key={`wp-${i}`}
          onPointerDown={(e) => onWaypointPointerDown(i, e)}
          onContextMenu={(e) => onWaypointContextMenu(i, e)}
          style={{ pointerEvents: selected ? 'all' : 'none' }}>
          {/* Large invisible hit area */}
          <circle cx={wp.x} cy={wp.y} r={10}
            fill="rgba(0,0,0,0.001)"
            style={{ cursor: 'grab' }} />
          {/* Visible dot — only when selected */}
          <circle cx={wp.x} cy={wp.y} r={4}
            fill="#3b82f6" stroke="white" strokeWidth={1.5}
            style={{ pointerEvents: 'none', opacity: selected ? 1 : 0, transition: 'opacity 0.15s' }} />
        </g>
      ))}

      {/* Label — draggable to reposition */}
      {label && (
        <g
          onPointerDown={onLabelPointerDown}
          style={{ cursor: 'grab', pointerEvents: 'painted' }}
        >
          {/* Invisible wider hit area for easier grabbing */}
          <rect
            x={finalLabelX - 40} y={finalLabelY - 22}
            width={80} height={20}
            fill="rgba(255,255,255,0.01)"
            style={{ pointerEvents: 'painted' }}
          />
          {/* Background pill for readability */}
          <rect
            x={finalLabelX - 36} y={finalLabelY - 21}
            width={72} height={16} rx={8}
            fill="var(--bg-card, white)" fillOpacity={0.95}
            stroke="var(--border-subtle, #e2e8f0)" strokeWidth={0.5}
            style={{ pointerEvents: 'none' }}
          />
          {/* Label text */}
          <text x={finalLabelX} y={finalLabelY - 10} textAnchor="middle" fontSize={9}
            fill={data.stroke || 'var(--text-secondary, #6b7280)'} fontFamily="Inter, sans-serif"
            fontWeight="500" letterSpacing="0.01em"
            style={{ pointerEvents: 'none', userSelect: 'none' }}>
            {label}
          </text>
        </g>
      )}

      {/* Unified type selector menu */}
      <EdgeMenu flowX={finalLabelX} flowY={finalLabelY} open={showMenu} onClose={() => setShowMenu(false)}>
        {kind !== 'child' ? (
          <UnifiedRelMenu
            edgeKind={kind}
            relId={data.relId}
            relType={data.relType}
            onClose={() => setShowMenu(false)}
          />
        ) : (
          <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Child connection (managed from parent's edit panel)
          </div>
        )}
      </EdgeMenu>
    </g>
  )
}

function UnifiedRelMenu({ edgeKind, relId, relType, onClose }: {
  edgeKind: 'structural' | 'emotional'
  relId: string
  relType: string
  onClose: () => void
}) {
  const [category, setCategory] = useState<'familial' | 'emotional'>(edgeKind === 'structural' ? 'familial' : 'emotional')
  const updateStructuralRelationship = useGenogramStore((s) => s.updateStructuralRelationship)
  const removeStructuralRelationship = useGenogramStore((s) => s.removeStructuralRelationship)
  const updateEmotionalRelationship = useGenogramStore((s) => s.updateEmotionalRelationship)
  const removeEmotionalRelationship = useGenogramStore((s) => s.removeEmotionalRelationship)
  const convertToEmotional = useGenogramStore((s) => s.convertToEmotional)
  const convertToStructural = useGenogramStore((s) => s.convertToStructural)

  const handleDelete = () => {
    if (edgeKind === 'structural') removeStructuralRelationship(relId)
    else removeEmotionalRelationship(relId)
    onClose()
  }

  return (
    <>
      {/* Category toggle */}
      <div className="flex mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setCategory('familial')}
          className="flex-1 px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ color: category === 'familial' ? 'var(--accent)' : 'var(--text-muted)', borderBottom: category === 'familial' ? '2px solid var(--accent)' : '2px solid transparent' }}>
          Familial
        </button>
        <button
          onClick={() => setCategory('emotional')}
          className="flex-1 px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ color: category === 'emotional' ? 'var(--accent)' : 'var(--text-muted)', borderBottom: category === 'emotional' ? '2px solid var(--accent)' : '2px solid transparent' }}>
          Emotional
        </button>
      </div>

      {/* Type list */}
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {category === 'familial' && Object.entries(StructuralRelType).map(([, type]) => (
          <button key={type}
            onClick={() => {
              if (edgeKind === 'structural') {
                updateStructuralRelationship(relId, { type })
              } else {
                convertToStructural(relId, type)
              }
              onClose()
            }}
            className="block w-full text-left px-3 py-1 text-sm transition-colors"
            style={{
              color: edgeKind === 'structural' && relType === type ? 'var(--accent)' : 'var(--text-primary)',
              backgroundColor: edgeKind === 'structural' && relType === type ? 'var(--accent-soft)' : 'transparent',
              fontWeight: edgeKind === 'structural' && relType === type ? 500 : 400,
            }}
            onMouseEnter={(e) => { if (!(edgeKind === 'structural' && relType === type)) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
            onMouseLeave={(e) => { if (!(edgeKind === 'structural' && relType === type)) e.currentTarget.style.backgroundColor = 'transparent' }}>
            {STRUCTURAL_REL_LABELS[type]}
          </button>
        ))}
        {category === 'emotional' && Object.entries(EmotionalRelType).map(([, type]) => (
          <button key={type}
            onClick={() => {
              if (edgeKind === 'emotional') {
                updateEmotionalRelationship(relId, { type })
              } else {
                convertToEmotional(relId, type)
              }
              onClose()
            }}
            className="block w-full text-left px-3 py-1 text-sm transition-colors"
            style={{
              color: edgeKind === 'emotional' && relType === type ? 'var(--accent)' : 'var(--text-primary)',
              backgroundColor: edgeKind === 'emotional' && relType === type ? 'var(--accent-soft)' : 'transparent',
              fontWeight: edgeKind === 'emotional' && relType === type ? 500 : 400,
            }}
            onMouseEnter={(e) => { if (!(edgeKind === 'emotional' && relType === type)) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
            onMouseLeave={(e) => { if (!(edgeKind === 'emotional' && relType === type)) e.currentTarget.style.backgroundColor = 'transparent' }}>
            <span className="inline-block w-3 h-0.5 mr-2 align-middle"
              style={{ backgroundColor: EMOTIONAL_EDGE_STYLES[type]?.stroke || 'var(--edge-color)' }} />
            {EMOTIONAL_REL_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Connection points */}
      <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="px-3 py-1 text-xs uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>Connection Points</div>
        <SnapPointPicker label="Source" relId={relId} relType={edgeKind} endpoint="source" onClose={onClose} />
        <SnapPointPicker label="Target" relId={relId} relType={edgeKind} endpoint="target" onClose={onClose} />
      </div>

      {/* Delete */}
      <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={handleDelete}
          className="block w-full text-left px-3 py-1.5 text-sm transition-colors"
          style={{ color: 'var(--danger)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--danger-soft)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
          Delete Relationship
        </button>
      </div>
    </>
  )
}

const SNAP_HANDLES: Array<{ id: string; label: string }> = [
  { id: 'top-left', label: 'TL' },
  { id: 'top-center', label: 'T' },
  { id: 'top-right', label: 'TR' },
  { id: 'left-center', label: 'L' },
  { id: 'right-center', label: 'R' },
  { id: 'bottom-left', label: 'BL' },
  { id: 'bottom-center', label: 'B' },
  { id: 'bottom-right', label: 'BR' },
]

function SnapPointPicker({ label, relId, relType, endpoint, onClose }: {
  label: string
  relId: string
  relType: 'structural' | 'emotional'
  endpoint: 'source' | 'target'
  onClose: () => void
}) {
  const updateEdgeRoute = useGenogramStore((s) => s.updateEdgeRoute)

  return (
    <div className="px-3 py-1">
      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label} point:</div>
      <div className="flex flex-wrap gap-1">
        {SNAP_HANDLES.map((h) => (
          <button
            key={h.id}
            onClick={() => {
              const update = endpoint === 'source'
                ? { sourceHandle: h.id }
                : { targetHandle: h.id }
              updateEdgeRoute(relType, relId, update)
              onClose()
            }}
            className="text-[10px] px-1.5 py-0.5 rounded-md transition-colors"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {h.label}
          </button>
        ))}
      </div>
    </div>
  )
}
