import { useState, useCallback, useRef } from 'react'
import type { EdgeProps, Edge } from '@xyflow/react'
import { useReactFlow } from '@xyflow/react'
import { EMOTIONAL_EDGE_STYLES, STRUCTURAL_EDGE_STYLES } from '../../constants/relationshipStyles'
import {
  StructuralRelType, STRUCTURAL_REL_LABELS,
  EmotionalRelType, EMOTIONAL_REL_LABELS,
} from '../../types/enums'
import { useGenogramStore } from '../../store/genogramStore'
import { EdgeMenu } from '../ui/EdgeMenu'

const SNAP = 20
function snap(v: number): number { return Math.round(v / SNAP) * SNAP }

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
}

type GenogramEdgeType = Edge<GenogramEdgeData, 'genogram'>

export function GenogramEdge({
  id, sourceX, sourceY, targetX, targetY,
  data, selected,
}: EdgeProps<GenogramEdgeType>) {
  const [showMenu, setShowMenu] = useState(false)
  const editingEdgeId = useGenogramStore((s) => s.ui.editingEdgeId)
  const setEditingEdgeId = useGenogramStore((s) => s.setEditingEdgeId)
  const editMode = editingEdgeId === id
  const { getViewport } = useReactFlow()
  const updateEdgeRoute = useGenogramStore((s) => s.updateEdgeRoute)
  const updateStructuralRelationship = useGenogramStore((s) => s.updateStructuralRelationship)
  const removeStructuralRelationship = useGenogramStore((s) => s.removeStructuralRelationship)
  const updateEmotionalRelationship = useGenogramStore((s) => s.updateEmotionalRelationship)
  const removeEmotionalRelationship = useGenogramStore((s) => s.removeEmotionalRelationship)

  if (!data) return null

  const kind = data.edgeKind
  const waypoints = data.waypoints || []
  const strokeColor = selected ? '#3b82f6' : (data.stroke || '#374151')

  // Build the full point list: source → waypoints → target
  const allPoints: Array<{ x: number; y: number }> = [
    { x: sourceX, y: sourceY },
    ...waypoints,
    { x: targetX, y: targetY },
  ]

  // Build SVG path through all points
  const pathD = allPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

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

  // Arrow marker for directed emotional edges
  const markerId = data.isDirected && data.markerEnd ? `arrow-${id}` : undefined

  // Click handler opens type menu
  // Single click: open type menu
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
    setEditingEdgeId(null)
  }, [showMenu, setEditingEdgeId])

  // Double click: toggle drag handle edit mode (persists in store)
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    setEditingEdgeId(editMode ? null : id)
  }, [editMode, id, setEditingEdgeId])

  // Drag a waypoint
  const dragRef = useRef<{ wpIndex: number; startX: number; startY: number; origX: number; origY: number } | null>(null)

  const onWaypointDrag = useCallback((wpIndex: number, e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    e.stopPropagation()
    e.preventDefault()
    const wp = waypoints[wpIndex]
    dragRef.current = { wpIndex, startX: e.clientX, startY: e.clientY, origX: wp.x, origY: wp.y }

    const onMove = (me: PointerEvent) => {
      if (!dragRef.current) return
      const zoom = getViewport().zoom
      const dx = (me.clientX - dragRef.current.startX) / zoom
      const dy = (me.clientY - dragRef.current.startY) / zoom
      const newWaypoints = [...waypoints]
      newWaypoints[dragRef.current.wpIndex] = {
        x: snap(dragRef.current.origX + dx),
        y: snap(dragRef.current.origY + dy),
      }
      updateEdgeRoute(kind === 'child' ? 'structural' : kind, data.relId, { waypoints: newWaypoints })
    }

    const onUp = (me: PointerEvent) => {
      ;(me.target as Element).releasePointerCapture?.(me.pointerId)
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [waypoints, data.relId, kind, getViewport, updateEdgeRoute])

  // Drag a segment midpoint to insert a new waypoint
  const onMidpointDrag = useCallback((afterIndex: number, e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    e.stopPropagation()
    e.preventDefault()

    const mid = segmentMids.find((s) => s.afterIndex === afterIndex)
    if (!mid) return

    // Insert a new waypoint at the midpoint
    const newWaypoints = [...waypoints]
    const insertAt = afterIndex // waypoint index (0-based, relative to waypoints array not allPoints)
    newWaypoints.splice(insertAt, 0, { x: snap(mid.x), y: snap(mid.y) })
    updateEdgeRoute(kind === 'child' ? 'structural' : kind, data.relId, { waypoints: newWaypoints })

    // Now track this newly inserted waypoint
    const newIdx = insertAt
    const startX = e.clientX
    const startY = e.clientY
    const origX = snap(mid.x)
    const origY = snap(mid.y)

    const onMove = (me: PointerEvent) => {
      const zoom = getViewport().zoom
      const dx = (me.clientX - startX) / zoom
      const dy = (me.clientY - startY) / zoom
      // Re-read current waypoints from store
      const state = useGenogramStore.getState()
      let rel
      if (kind === 'structural' || kind === 'child') {
        rel = state.structuralRelationships[data.relId]
      } else {
        rel = state.emotionalRelationships[data.relId]
      }
      if (!rel) return
      const currentWaypoints = [...rel.route.waypoints]
      if (currentWaypoints[newIdx]) {
        currentWaypoints[newIdx] = { x: snap(origX + dx), y: snap(origY + dy) }
        updateEdgeRoute(kind === 'child' ? 'structural' : kind, data.relId, { waypoints: currentWaypoints })
      }
    }

    const onUp = (me: PointerEvent) => {
      ;(me.target as Element).releasePointerCapture?.(me.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [waypoints, segmentMids, data.relId, kind, getViewport, updateEdgeRoute])

  // Render structural-specific decorations
  const renderStructuralDecorations = () => {
    if (kind !== 'structural') return null
    const slashes = data.slashes || 0
    const midX = labelX
    const midY = labelY

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

  // Render multi-line for emotional edges
  const renderMultiLine = () => {
    const count = data.lineCount || 1
    if (count <= 1) return null
    const spacing = 3
    return Array.from({ length: count - 1 }).map((_, i) => {
      const offset = (i + 1 - (count - 1) / 2) * spacing
      if (Math.abs(offset) < 0.5) return null
      // Simple parallel offset (approximate)
      const dx = targetX - sourceX
      const dy = targetY - sourceY
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const nx = -dy / len * offset
      const ny = dx / len * offset
      const offsetPath = allPoints.map((p, j) =>
        `${j === 0 ? 'M' : 'L'} ${p.x + nx} ${p.y + ny}`
      ).join(' ')
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

      {/* Invisible click/double-click area */}
      <path d={pathD} fill="none" stroke="transparent" strokeWidth={16}
        style={{ cursor: editMode ? 'move' : 'pointer' }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick} />

      {/* Main visible path */}
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={lineWidth}
        strokeDasharray={dashArray}
        markerEnd={markerId ? `url(#${markerId})` : undefined}
        style={{ pointerEvents: 'none' }} />

      {/* Extra parallel lines for multi-line emotional edges */}
      {renderMultiLine()}

      {/* Structural decorations (slashes, widowed X) */}
      {renderStructuralDecorations()}

      {/* Label */}
      {label && (
        <text x={labelX} y={labelY - 10} textAnchor="middle" fontSize={9}
          fill={data.stroke || '#6b7280'} fontFamily="sans-serif"
          style={{ pointerEvents: 'none' }}>
          {label}
        </text>
      )}

      {/* Highlight the line when in edit mode */}
      {editMode && (
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={3}
          strokeDasharray="6 3" style={{ pointerEvents: 'none', opacity: 0.5 }} />
      )}

      {/* Draggable handles only shown when in edit mode (double-click to toggle) */}
      {editMode && (
        <>
          {/* Waypoint handles */}
          {waypoints.map((wp, i) => (
            <g key={`wp-${i}`}>
              <circle cx={wp.x} cy={wp.y} r={12} fill="transparent"
                style={{ cursor: 'grab' }} onPointerDown={(e) => onWaypointDrag(i, e)} />
              <circle cx={wp.x} cy={wp.y} r={4}
                fill="#3b82f6" stroke="white" strokeWidth={1.5}
                style={{ pointerEvents: 'none' }} />
            </g>
          ))}

          {/* Segment midpoint handles */}
          {segmentMids.map((mid, i) => (
            <g key={`mid-${i}`}>
              <circle cx={mid.x} cy={mid.y} r={10} fill="transparent"
                style={{ cursor: 'crosshair' }}
                onPointerDown={(e) => onMidpointDrag(mid.afterIndex, e)} />
              <circle cx={mid.x} cy={mid.y} r={3}
                fill="#60a5fa" stroke="white" strokeWidth={1}
                style={{ pointerEvents: 'none' }} />
            </g>
          ))}
        </>
      )}

      {/* Unified type selector menu */}
      <EdgeMenu flowX={labelX} flowY={labelY} open={showMenu} onClose={() => setShowMenu(false)}>
        {kind !== 'child' ? (
          <UnifiedRelMenu
            edgeKind={kind}
            relId={data.relId}
            relType={data.relType}
            onClose={() => setShowMenu(false)}
          />
        ) : (
          <div className="px-3 py-2 text-sm text-gray-500">
            Child connection (managed from parent's edit panel)
          </div>
        )}
      </EdgeMenu>
    </g>
  )
}

const SNAP_POINT_OPTIONS = [
  { id: 'couple-right', label: 'Right' },
  { id: 'couple-left', label: 'Left' },
  { id: 'child-top', label: 'Top Center' },
  { id: 'emo-top', label: 'Top Center' },
  { id: 'emo-bottom', label: 'Bottom Center' },
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-right', label: 'Bottom Right' },
]

// Source handles must be type="source", target handles must be type="target"
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
      <div className="flex border-b border-gray-200 mb-1">
        <button
          onClick={() => setCategory('familial')}
          className={`flex-1 px-3 py-1.5 text-xs font-semibold ${category === 'familial' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-400'}`}>
          Familial
        </button>
        <button
          onClick={() => setCategory('emotional')}
          className={`flex-1 px-3 py-1.5 text-xs font-semibold ${category === 'emotional' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-400'}`}>
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
                // Convert from emotional to structural
                convertToStructural(relId, type)
              }
              onClose()
            }}
            className={`block w-full text-left px-3 py-1 hover:bg-gray-100 text-sm ${edgeKind === 'structural' && relType === type ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
            {STRUCTURAL_REL_LABELS[type]}
          </button>
        ))}
        {category === 'emotional' && Object.entries(EmotionalRelType).map(([, type]) => (
          <button key={type}
            onClick={() => {
              if (edgeKind === 'emotional') {
                updateEmotionalRelationship(relId, { type })
              } else {
                // Convert from structural to emotional
                convertToEmotional(relId, type)
              }
              onClose()
            }}
            className={`block w-full text-left px-3 py-1 hover:bg-gray-100 text-sm ${edgeKind === 'emotional' && relType === type ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
            <span className="inline-block w-3 h-0.5 mr-2 align-middle"
              style={{ backgroundColor: EMOTIONAL_EDGE_STYLES[type]?.stroke || '#374151' }} />
            {EMOTIONAL_REL_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Connection points */}
      <div className="border-t border-gray-200 mt-1 pt-1">
        <div className="px-3 py-1 text-xs text-gray-400 uppercase font-semibold">Connection Points</div>
        <SnapPointPicker label="Source" relId={relId} relType={edgeKind} endpoint="source" onClose={onClose} />
        <SnapPointPicker label="Target" relId={relId} relType={edgeKind} endpoint="target" onClose={onClose} />
      </div>

      {/* Delete */}
      <div className="border-t border-gray-200 mt-1 pt-1">
        <button onClick={handleDelete}
          className="block w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 text-sm">
          Delete Relationship
        </button>
      </div>
    </>
  )
}

function SnapPointPicker({ label, relId, relType, endpoint, onClose }: {
  label: string
  currentHandle?: string
  relId: string
  relType: 'structural' | 'emotional'
  endpoint: 'source' | 'target'
  onClose: () => void
}) {
  const updateEdgeRoute = useGenogramStore((s) => s.updateEdgeRoute)
  const handles = endpoint === 'source'
    ? [
        { id: 'couple-right', label: 'Right' },
        { id: 'emo-top', label: 'Top' },
        { id: 'top-left', label: 'Top Left' },
        { id: 'top-right', label: 'Top Right' },
        { id: 'bottom-center', label: 'Bottom' },
        { id: 'bottom-left', label: 'Bottom Left' },
        { id: 'bottom-right', label: 'Bottom Right' },
        { id: 'left-center', label: 'Left' },
        { id: 'right-center', label: 'Right' },
      ]
    : [
        { id: 'couple-left', label: 'Left' },
        { id: 'emo-bottom', label: 'Bottom' },
        { id: 'child-top', label: 'Top' },
        { id: 'top-left', label: 'Top Left' },
        { id: 'top-right', label: 'Top Right' },
        { id: 'bottom-left', label: 'Bottom Left' },
        { id: 'bottom-right', label: 'Bottom Right' },
        { id: 'left-center', label: 'Left' },
        { id: 'right-center', label: 'Right' },
      ]

  return (
    <div className="px-3 py-1">
      <div className="text-xs text-gray-500 mb-1">{label} point:</div>
      <div className="flex flex-wrap gap-1">
        {handles.map((h) => (
          <button
            key={h.id}
            onClick={() => {
              const update = endpoint === 'source'
                ? { sourceHandle: h.id }
                : { targetHandle: h.id }
              updateEdgeRoute(relType, relId, update)
              onClose()
            }}
            className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded hover:bg-blue-100 hover:text-blue-700"
          >
            {h.label}
          </button>
        ))}
      </div>
    </div>
  )
}
