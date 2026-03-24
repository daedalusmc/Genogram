import { useState, useCallback, useRef } from 'react'
import type { EdgeProps, Edge } from '@xyflow/react'
import { useReactFlow } from '@xyflow/react'
import { EMOTIONAL_EDGE_STYLES } from '../../constants/relationshipStyles'
import { EmotionalRelType, EMOTIONAL_REL_LABELS } from '../../types/enums'
import { useGenogramStore } from '../../store/genogramStore'
import { EdgeMenu } from '../ui/EdgeMenu'

const SNAP = 20
function snapToGrid(v: number): number {
  return Math.round(v / SNAP) * SNAP
}

export type EmotionalEdgeData = {
  relId: string
  relType: EmotionalRelType
  isDirected: boolean
  notes: string
}

type EmotionalEdgeType = Edge<EmotionalEdgeData, 'emotional'>

export function EmotionalEdge({
  id, sourceX, sourceY, targetX, targetY,
  data, selected,
}: EdgeProps<EmotionalEdgeType>) {
  const [showMenu, setShowMenu] = useState(false)
  const { getViewport } = useReactFlow()
  const updateEmotionalRelationship = useGenogramStore((s) => s.updateEmotionalRelationship)
  const removeEmotionalRelationship = useGenogramStore((s) => s.removeEmotionalRelationship)
  const edgeWaypoints = useGenogramStore((s) => s.edgeWaypoints)
  const setEdgeWaypoint = useGenogramStore((s) => s.setEdgeWaypoint)

  const style = data?.relType ? EMOTIONAL_EDGE_STYLES[data.relType] : EMOTIONAL_EDGE_STYLES.normal
  const stroke = selected ? '#3b82f6' : style.stroke
  const lineCount = style.lineCount || 1
  const lineSpacing = 3

  // Curvature: stored as a waypoint offset, default curves away from center
  const wp = edgeWaypoints[id] || {}
  const defaultCurve = 60
  const curveOffset = wp.dropX ?? defaultCurve // reuse dropX field for curve strength

  // Build bezier curve
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = -dy / dist
  const ny = dx / dist
  const cx1 = sourceX + dx * 0.25 + nx * curveOffset
  const cy1 = sourceY + dy * 0.25 + ny * curveOffset
  const cx2 = sourceX + dx * 0.75 + nx * curveOffset
  const cy2 = sourceY + dy * 0.75 + ny * curveOffset

  const basePath = `M ${sourceX} ${sourceY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetX} ${targetY}`

  const markerId = data?.isDirected && style.markerEnd ? `arrow-${id}` : undefined

  // Midpoint for label and drag handle
  const midT = 0.5
  const midX = bezierPoint(sourceX, cx1, cx2, targetX, midT)
  const midY = bezierPoint(sourceY, cy1, cy2, targetY, midT)

  // Zigzag/wavy overlays
  const zigzagPath = style.pattern === 'zigzag' ? buildZigzagAlongCurve(
    sourceX, sourceY, cx1, cy1, cx2, cy2, targetX, targetY, 8, 6
  ) : null
  const wavyPath = (style.pattern === 'wavy' || style.pattern === 'double-wavy')
    ? buildWavyAlongCurve(sourceX, sourceY, cx1, cy1, cx2, cy2, targetX, targetY, 10, 5)
    : null

  // Drag handle for curvature - drag perpendicular to line to change curve direction
  const dragRef = useRef<{ startX: number; startY: number; startVal: number } | null>(null)
  const onMidpointPointerDown = useCallback((e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, startVal: curveOffset }

    const onPointerMove = (me: PointerEvent) => {
      if (!dragRef.current) return
      const zoom = getViewport().zoom
      const dxScreen = (me.clientX - dragRef.current.startX) / zoom
      const dyScreen = (me.clientY - dragRef.current.startY) / zoom
      const perpDist = dxScreen * nx + dyScreen * ny
      const newCurve = snapToGrid(dragRef.current.startVal + perpDist)
      setEdgeWaypoint(id, { dropX: newCurve })
    }
    const onPointerUp = (me: PointerEvent) => {
      ;(me.target as Element).releasePointerCapture?.(me.pointerId)
      dragRef.current = null
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [id, curveOffset, setEdgeWaypoint, getViewport, nx, ny])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }, [showMenu])

  return (
    <g>
      <defs>
        {markerId && (
          <marker id={markerId} markerWidth={10} markerHeight={8} refX={9} refY={4} orient="auto">
            <path d="M0,0 L10,4 L0,8 Z" fill={stroke} />
          </marker>
        )}
      </defs>

      {/* Invisible wide hit area */}
      <path d={basePath} fill="none" stroke="transparent" strokeWidth={20}
        style={{ cursor: 'pointer' }} onClick={handleClick} />

      {/* Main line(s) */}
      {!zigzagPath && !wavyPath && Array.from({ length: lineCount }).map((_, i) => {
        const offset = (i - (lineCount - 1) / 2) * lineSpacing
        const offsetPath = buildOffsetCurve(sourceX, sourceY, cx1, cy1, cx2, cy2, targetX, targetY, offset, nx, ny)
        return (
          <path key={i} d={offsetPath} fill="none" stroke={stroke}
            strokeWidth={style.strokeWidth} strokeDasharray={style.strokeDasharray}
            markerEnd={i === Math.floor(lineCount / 2) && markerId ? `url(#${markerId})` : undefined}
            style={{ pointerEvents: 'none' }} />
        )
      })}

      {zigzagPath && (
        <polyline points={zigzagPath} fill="none" stroke={stroke}
          strokeWidth={style.strokeWidth} strokeLinejoin="round"
          markerEnd={markerId ? `url(#${markerId})` : undefined}
          style={{ pointerEvents: 'none' }} />
      )}

      {wavyPath && (
        <>
          <path d={wavyPath} fill="none" stroke={stroke} strokeWidth={style.strokeWidth}
            markerEnd={markerId ? `url(#${markerId})` : undefined} style={{ pointerEvents: 'none' }} />
          {style.pattern === 'double-wavy' && (
            <path d={buildWavyAlongCurve(sourceX, sourceY, cx1, cy1, cx2, cy2, targetX, targetY, 10, 5, 3)}
              fill="none" stroke={stroke} strokeWidth={style.strokeWidth} style={{ pointerEvents: 'none' }} />
          )}
        </>
      )}

      {/* Label */}
      <text x={midX} y={midY - 10} textAnchor="middle" fontSize={9} fill={stroke}
        fontFamily="sans-serif" style={{ pointerEvents: 'none' }}>
        {style.label}
      </text>

      {/* Draggable midpoint handle - invisible hit area + visible small dot */}
      <circle cx={midX} cy={midY} r={12}
        fill="transparent" style={{ cursor: 'grab' }}
        onPointerDown={onMidpointPointerDown} />
      <circle cx={midX} cy={midY} r={3.5}
        fill={selected ? '#3b82f6' : '#94a3b8'} stroke="white" strokeWidth={1}
        style={{ pointerEvents: 'none' }} />

      {/* Fixed-size menu via portal */}
      <EdgeMenu flowX={midX} flowY={midY} open={showMenu} onClose={() => setShowMenu(false)}>
        <div className="px-3 py-1 text-xs text-gray-400 uppercase font-semibold">Type</div>
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {Object.entries(EmotionalRelType).map(([key, type]) => (
            <button key={type}
              onClick={() => { if (data?.relId) updateEmotionalRelationship(data.relId, { type }); setShowMenu(false); }}
              className={`block w-full text-left px-3 py-1 hover:bg-gray-100 ${data?.relType === type ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
              <span className="inline-block w-3 h-0.5 mr-2 align-middle"
                style={{ backgroundColor: EMOTIONAL_EDGE_STYLES[type].stroke }} />
              {EMOTIONAL_REL_LABELS[type]}
            </button>
          ))}
        </div>
        <div className="border-t border-gray-200 mt-1 pt-1">
          <button
            onClick={() => { if (data?.relId) removeEmotionalRelationship(data.relId); setShowMenu(false); }}
            className="block w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50">
            Delete Relationship
          </button>
        </div>
      </EdgeMenu>
    </g>
  )
}

function bezierPoint(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3
}

function buildOffsetCurve(
  sx: number, sy: number, cx1: number, cy1: number,
  cx2: number, cy2: number, tx: number, ty: number,
  offset: number, nx: number, ny: number,
): string {
  if (Math.abs(offset) < 0.5) return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`
  return `M ${sx + nx * offset} ${sy + ny * offset} C ${cx1 + nx * offset} ${cy1 + ny * offset}, ${cx2 + nx * offset} ${cy2 + ny * offset}, ${tx + nx * offset} ${ty + ny * offset}`
}

function buildZigzagAlongCurve(
  sx: number, sy: number, cx1: number, cy1: number,
  cx2: number, cy2: number, tx: number, ty: number,
  segments: number, amplitude: number,
): string {
  const points: string[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = bezierPoint(sx, cx1, cx2, tx, t)
    const y = bezierPoint(sy, cy1, cy2, ty, t)
    const dt = 0.01
    const t2 = Math.min(t + dt, 1)
    const ddx = bezierPoint(sx, cx1, cx2, tx, t2) - x
    const ddy = bezierPoint(sy, cy1, cy2, ty, t2) - y
    const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1
    const perpX = -ddy / len
    const perpY = ddx / len
    const sign = i % 2 === 0 ? 1 : -1
    const amp = (i === 0 || i === segments) ? 0 : amplitude * sign
    points.push(`${x + perpX * amp},${y + perpY * amp}`)
  }
  return points.join(' ')
}

function buildWavyAlongCurve(
  sx: number, sy: number, cx1: number, cy1: number,
  cx2: number, cy2: number, tx: number, ty: number,
  waves: number, amplitude: number, yOffset = 0,
): string {
  const steps = waves * 4
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const bx = bezierPoint(sx, cx1, cx2, tx, t)
    const by = bezierPoint(sy, cy1, cy2, ty, t)
    const dt = 0.01
    const t2 = Math.min(t + dt, 1)
    const ddx = bezierPoint(sx, cx1, cx2, tx, t2) - bx
    const ddy = bezierPoint(sy, cy1, cy2, ty, t2) - by
    const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1
    const perpX = -ddy / len
    const perpY = ddx / len
    const wave = Math.sin(t * waves * Math.PI * 2) * amplitude
    pts.push({ x: bx + perpX * (wave + yOffset), y: by + perpY * (wave + yOffset) })
  }
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`
  return d
}
