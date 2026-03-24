import { useCallback, useRef } from 'react'
import type { EdgeProps, Edge } from '@xyflow/react'
import { useReactFlow } from '@xyflow/react'
import type { ChildConnectionType } from '../../types/enums'
import { useGenogramStore } from '../../store/genogramStore'

const SNAP = 20
function snapToGrid(v: number): number {
  return Math.round(v / SNAP) * SNAP
}

export type ChildEdgeData = {
  connectionType: ChildConnectionType
  twinSiblingId?: string
  isIdenticalTwin?: boolean
  coupleLineY?: number
  coupleMidX?: number
}

type ChildEdgeType = Edge<ChildEdgeData, 'child'>

export function ChildEdge({
  id, sourceX, sourceY, targetX, targetY,
  data, selected,
}: EdgeProps<ChildEdgeType>) {
  const connectionType = data?.connectionType || 'biological'
  const strokeColor = selected ? '#3b82f6' : '#374151'

  const { getViewport } = useReactFlow()
  const edgeWaypoints = useGenogramStore((s) => s.edgeWaypoints)
  const setEdgeWaypoint = useGenogramStore((s) => s.setEdgeWaypoint)

  const wp = edgeWaypoints[id] || {}
  const defaultDropX = data?.coupleMidX ?? ((sourceX + targetX) / 2)
  const defaultBarY = (data?.coupleLineY ?? sourceY) + 80
  const dropX = wp.dropX ?? defaultDropX
  const barY = wp.barY ?? defaultBarY
  const coupleY = data?.coupleLineY ?? sourceY

  const path = [
    `M ${dropX} ${coupleY}`,
    `L ${dropX} ${barY}`,
    `L ${targetX} ${barY}`,
    `L ${targetX} ${targetY}`,
  ].join(' ')

  let strokeDasharray: string | undefined
  if (connectionType === 'foster') strokeDasharray = '6 4'

  const dragRef = useRef<{ handle: 'drop' | 'bar'; startX: number; startY: number; startVal: number } | null>(null)

  const onDragStart = useCallback((handle: 'drop' | 'bar', e: React.PointerEvent) => {
    // Capture pointer to prevent React Flow from panning
    ;(e.target as Element).setPointerCapture(e.pointerId)
    e.stopPropagation()
    e.preventDefault()

    const startVal = handle === 'drop' ? dropX : barY
    dragRef.current = { handle, startX: e.clientX, startY: e.clientY, startVal }

    const onPointerMove = (me: PointerEvent) => {
      if (!dragRef.current) return
      const zoom = getViewport().zoom
      const { handle: h, startX, startY, startVal: sv } = dragRef.current
      if (h === 'drop') {
        setEdgeWaypoint(id, { dropX: snapToGrid(sv + (me.clientX - startX) / zoom) })
      } else {
        setEdgeWaypoint(id, { barY: snapToGrid(sv + (me.clientY - startY) / zoom) })
      }
    }

    const onPointerUp = (me: PointerEvent) => {
      ;(me.target as Element).releasePointerCapture?.(me.pointerId)
      dragRef.current = null
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [id, dropX, barY, setEdgeWaypoint, getViewport])

  return (
    <g>
      {/* Visible path (no pointer events — handles capture instead) */}
      <path d={path} fill="none" stroke={strokeColor} strokeWidth={2}
        strokeDasharray={strokeDasharray} style={{ pointerEvents: 'none' }} />

      {connectionType === 'adopted' && (
        <g style={{ pointerEvents: 'none' }}>
          <line x1={targetX - 10} y1={targetY - 16} x2={targetX - 10} y2={targetY - 6} stroke={strokeColor} strokeWidth={2} />
          <line x1={targetX + 10} y1={targetY - 16} x2={targetX + 10} y2={targetY - 6} stroke={strokeColor} strokeWidth={2} />
          <line x1={targetX - 10} y1={targetY - 16} x2={targetX + 10} y2={targetY - 16} stroke={strokeColor} strokeWidth={2} />
        </g>
      )}

      {/* Drop point handle (horizontal drag along couple line) */}
      <circle cx={dropX} cy={coupleY} r={12}
        fill="transparent" style={{ cursor: 'ew-resize' }}
        onPointerDown={(e) => onDragStart('drop', e)} />
      <circle cx={dropX} cy={coupleY} r={3.5}
        fill={selected ? '#3b82f6' : '#94a3b8'} stroke="white" strokeWidth={1}
        style={{ pointerEvents: 'none' }} />

      {/* Sibling bar handle (vertical drag) */}
      <circle cx={(dropX + targetX) / 2} cy={barY} r={12}
        fill="transparent" style={{ cursor: 'ns-resize' }}
        onPointerDown={(e) => onDragStart('bar', e)} />
      <circle cx={(dropX + targetX) / 2} cy={barY} r={3.5}
        fill={selected ? '#3b82f6' : '#94a3b8'} stroke="white" strokeWidth={1}
        style={{ pointerEvents: 'none' }} />
    </g>
  )
}
