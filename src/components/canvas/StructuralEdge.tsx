import { useState, useCallback, useRef } from 'react'
import type { EdgeProps, Edge } from '@xyflow/react'
import { useReactFlow } from '@xyflow/react'
import { STRUCTURAL_EDGE_STYLES } from '../../constants/relationshipStyles'
import { StructuralRelType, STRUCTURAL_REL_LABELS } from '../../types/enums'
import { useGenogramStore } from '../../store/genogramStore'
import { EdgeMenu } from '../ui/EdgeMenu'

const SNAP = 20
function snapToGrid(v: number): number {
  return Math.round(v / SNAP) * SNAP
}

export type StructuralEdgeData = {
  relId: string
  relType: StructuralRelType
  startDate: string | null
  endDate: string | null
}

type StructuralEdgeType = Edge<StructuralEdgeData, 'structural'>

export function StructuralEdge({
  id, sourceX, sourceY, targetX, targetY,
  data, selected,
}: EdgeProps<StructuralEdgeType>) {
  const [showMenu, setShowMenu] = useState(false)
  const { getViewport } = useReactFlow()
  const updateStructuralRelationship = useGenogramStore((s) => s.updateStructuralRelationship)
  const removeStructuralRelationship = useGenogramStore((s) => s.removeStructuralRelationship)
  const edgeWaypoints = useGenogramStore((s) => s.edgeWaypoints)
  const setEdgeWaypoint = useGenogramStore((s) => s.setEdgeWaypoint)

  const style = data?.relType ? STRUCTURAL_EDGE_STYLES[data.relType] : STRUCTURAL_EDGE_STYLES.marriage
  const strokeColor = selected ? '#3b82f6' : '#374151'

  // Waypoint: the Y level of the horizontal segment (defaults to average Y)
  const wp = edgeWaypoints[id] || {}
  const defaultLineY = (sourceY + targetY) / 2
  const lineY = wp.barY ?? defaultLineY

  // Build orthogonal path: source → horizontal at lineY → target
  // If source and target are at same Y, it's just a horizontal line
  // Otherwise: vertical from source to lineY, horizontal to targetX, vertical to target
  const sameLine = Math.abs(sourceY - targetY) < 4 && Math.abs(sourceY - lineY) < 4

  let path: string
  let vertices: Array<{ x: number; y: number; type: 'h' | 'v' }> = []

  if (sameLine) {
    // Simple horizontal line
    path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
    vertices = [{ x: (sourceX + targetX) / 2, y: sourceY, type: 'v' }]
  } else {
    // Orthogonal routing with horizontal segment at lineY
    path = `M ${sourceX} ${sourceY} L ${sourceX} ${lineY} L ${targetX} ${lineY} L ${targetX} ${targetY}`
    vertices = [
      { x: sourceX, y: (sourceY + lineY) / 2, type: 'h' }, // midpoint of first vertical segment
      { x: (sourceX + targetX) / 2, y: lineY, type: 'v' },  // midpoint of horizontal segment
      { x: targetX, y: (lineY + targetY) / 2, type: 'h' },  // midpoint of second vertical segment
    ]
  }

  const midX = (sourceX + targetX) / 2
  const labelY = sameLine ? sourceY : lineY

  const dateLabel = [data?.startDate, data?.endDate].filter(Boolean).join(' - ')

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }, [showMenu])

  // Drag handler for the horizontal bar Y position
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null)
  const onBarDrag = useCallback((e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startVal: lineY }

    const onPointerMove = (me: PointerEvent) => {
      if (!dragRef.current) return
      const zoom = getViewport().zoom
      const dy = (me.clientY - dragRef.current.startY) / zoom
      setEdgeWaypoint(id, { barY: snapToGrid(dragRef.current.startVal + dy) })
    }
    const onPointerUp = (me: PointerEvent) => {
      ;(me.target as Element).releasePointerCapture?.(me.pointerId)
      dragRef.current = null
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [id, lineY, setEdgeWaypoint, getViewport])

  return (
    <g>
      {/* Visible orthogonal path */}
      <path d={path} fill="none" stroke={strokeColor} strokeWidth={2}
        strokeDasharray={style?.strokeDasharray} style={{ pointerEvents: 'none' }} />

      {/* Invisible click area along the path */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={16}
        style={{ cursor: 'pointer' }} onClick={handleClick} />

      {/* Slash marks for separation/divorce */}
      {style && style.slashes > 0 && Array.from({ length: style.slashes }).map((_, i) => {
        const offset = style.slashes === 1 ? 0 : (i - 0.5) * 8
        return (
          <line key={i}
            x1={midX + offset - 4} y1={labelY - 8}
            x2={midX + offset + 4} y2={labelY + 8}
            stroke={strokeColor} strokeWidth={2} style={{ pointerEvents: 'none' }} />
        )
      })}

      {/* Widowed X */}
      {data?.relType === 'widowed' && (
        <g style={{ pointerEvents: 'none' }}>
          <line x1={midX - 5} y1={labelY - 5} x2={midX + 5} y2={labelY + 5} stroke={strokeColor} strokeWidth={2} />
          <line x1={midX + 5} y1={labelY - 5} x2={midX - 5} y2={labelY + 5} stroke={strokeColor} strokeWidth={2} />
        </g>
      )}

      {/* Label */}
      <text x={midX} y={labelY - 8} textAnchor="middle" fontSize={9} fill="#6b7280"
        fontFamily="sans-serif" style={{ pointerEvents: 'none' }}>
        {dateLabel || style?.label || ''}
      </text>

      {/* Draggable vertex handles */}
      {vertices.map((v, i) => (
        <g key={i}>
          <circle cx={v.x} cy={v.y} r={12} fill="transparent"
            style={{ cursor: v.type === 'v' ? 'ns-resize' : 'ew-resize' }}
            onPointerDown={v.type === 'v' ? onBarDrag : undefined} />
          <circle cx={v.x} cy={v.y} r={3} fill={selected ? '#3b82f6' : '#94a3b8'}
            stroke="white" strokeWidth={1} style={{ pointerEvents: 'none' }} />
        </g>
      ))}

      {/* Fixed-size dropdown menu */}
      <EdgeMenu flowX={midX} flowY={labelY} open={showMenu} onClose={() => setShowMenu(false)}>
        {Object.entries(StructuralRelType).map(([key, type]) => (
          <button key={type}
            onClick={() => { if (data?.relId) updateStructuralRelationship(data.relId, { type }); setShowMenu(false); }}
            className={`block w-full text-left px-3 py-1.5 hover:bg-gray-100 ${data?.relType === type ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
            {STRUCTURAL_REL_LABELS[type]}
          </button>
        ))}
        <div className="border-t border-gray-200 mt-1 pt-1">
          <button onClick={() => { if (data?.relId) removeStructuralRelationship(data.relId); setShowMenu(false); }}
            className="block w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50">
            Delete Relationship
          </button>
        </div>
      </EdgeMenu>
    </g>
  )
}
