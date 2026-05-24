import { useCallback, useMemo, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
  type EdgeTypes,
  type OnNodeDrag,
  BackgroundVariant,
  ConnectionMode,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useGenogramStore } from '../../store/genogramStore'
import { PersonNodeMemo } from './PersonNode'
import { GenogramEdge } from './GenogramEdge'
import { STRUCTURAL_EDGE_STYLES, EMOTIONAL_EDGE_STYLES } from '../../constants/relationshipStyles'
import { StructuralRelType, EmotionalRelType, ChildConnectionType } from '../../types/enums'
import { useAutoLayout } from '../../hooks/useAutoLayout'
import { computeAllEdgeRoutes } from '../../utils/edgeRouter'
import { computeGenerations } from '../../utils/generations'

const nodeTypes: NodeTypes = {
  person: PersonNodeMemo,
}

const edgeTypes: EdgeTypes = {
  genogram: GenogramEdge,
}

const SNAP_GRID: [number, number] = [20, 20]

// Snap point positions relative to node top-left
// Shape: 60px SVG centered in 120px container → shape edges at x=34/86, y=4/56
const HANDLE_POS: Record<string, { x: number; y: number }> = {
  'top-center': { x: 60, y: 4 },
  'top-left': { x: 34, y: 4 },
  'top-right': { x: 86, y: 4 },
  'bottom-center': { x: 60, y: 56 },
  'bottom-left': { x: 34, y: 56 },
  'bottom-right': { x: 86, y: 56 },
  'left-center': { x: 34, y: 30 },
  'right-center': { x: 86, y: 30 },
}

// Normalize a handle id to its canonical snap point id. Strips any stale -tgt
// suffix from legacy data and resolves legacy alias ids to real snap ids.
const ALIAS_TO_SNAP: Record<string, string> = {
  'couple-right': 'right-center',
  'couple-left': 'left-center',
  'child-top': 'top-center',
  'emo-top': 'top-center',
  'emo-bottom': 'bottom-center',
}
function toSnapId(id: string): string {
  const clean = id.endsWith('-tgt') ? id.slice(0, -4) : id
  return ALIAS_TO_SNAP[clean] || clean
}

export function GenogramCanvas() {
  const persons = useGenogramStore((s) => s.persons)
  const structuralRels = useGenogramStore((s) => s.structuralRelationships)
  const emotionalRels = useGenogramStore((s) => s.emotionalRelationships)
  const nodePositions = useGenogramStore((s) => s.nodePositions)
  const layoutVersion = useGenogramStore((s) => s.layoutVersion)
  const ui = useGenogramStore((s) => s.ui)
  const openPersonPanel = useGenogramStore((s) => s.openPersonPanel)
  const cancelAddingRelationship = useGenogramStore((s) => s.cancelAddingRelationship)
  const presentationOrder = useGenogramStore((s) => s.presentationOrder)
  const setPresentationIndex = useGenogramStore((s) => s.setPresentationIndex)
  const addStructuralRelationship = useGenogramStore((s) => s.addStructuralRelationship)
  const addEmotionalRelationship = useGenogramStore((s) => s.addEmotionalRelationship)
  const addChildToRelationship = useGenogramStore((s) => s.addChildToRelationship)
  const selectPerson = useGenogramStore((s) => s.selectPerson)
  const setNodePosition = useGenogramStore((s) => s.setNodePosition)
  const setNodePositions = useGenogramStore((s) => s.setNodePositions)
  const batchUpdateEdgeRoutes = useGenogramStore((s) => s.batchUpdateEdgeRoutes)

  const { layoutNodes } = useAutoLayout()
  const { fitView } = useReactFlow()

  // Track previous layoutVersion to detect full re-layout
  const prevLayoutVersionRef = useRef(layoutVersion)

  // Auto-layout for new nodes + edge routing on full re-layout
  useEffect(() => {
    const personIds = Object.keys(persons)
    const needsLayout = personIds.some((id) => !nodePositions[id])
    const isFullReLayout = layoutVersion !== prevLayoutVersionRef.current
    prevLayoutVersionRef.current = layoutVersion

    if (needsLayout && personIds.length > 0) {
      const computed = layoutNodes(persons, structuralRels)
      const newPositions: Record<string, { x: number; y: number }> = { ...nodePositions }
      for (const id of personIds) {
        if (!newPositions[id] && computed[id]) {
          newPositions[id] = computed[id]
        }
      }
      setNodePositions(newPositions)

      // On full re-layout, also compute smart edge routes
      if (isFullReLayout) {
        const allPositions = { ...newPositions }
        // Use computed positions for all nodes
        for (const id of personIds) {
          if (computed[id]) allPositions[id] = computed[id]
        }

        const routes = computeAllEdgeRoutes(allPositions, structuralRels, emotionalRels)

        // Build batch updates
        const updates: Array<{ relType: 'structural' | 'emotional'; relId: string; route: Partial<import('../../types/relationship').EdgeRoute> }> = []

        for (const [relId, route] of Object.entries(routes.structural)) {
          updates.push({ relType: 'structural', relId, route })
        }
        for (const [relId, route] of Object.entries(routes.emotional)) {
          updates.push({ relType: 'emotional', relId, route })
        }

        if (updates.length > 0) {
          batchUpdateEdgeRoutes(updates)
        }
      }
    }
  }, [Object.keys(persons).length, layoutVersion])

  // Build nodes
  const flowNodes = useMemo<Node[]>(() => {
    return Object.values(persons).map((person, index) => {
      // Fallback position for a person without a stored position. The real
      // layout is computed in useAutoLayout — this is just a "somewhere
      // visible" default until that runs.
      const pos = nodePositions[person.id] || { x: index * 180, y: 0 }
      return {
        id: person.id,
        type: 'person',
        position: pos,
        data: { person },
        selected: ui.selectedPersonId === person.id,
        dragHandle: '.drag-handle',
      }
    })
  }, [persons, nodePositions, ui.selectedPersonId])

  // Build edges using unified GenogramEdge
  const flowEdges = useMemo<Edge[]>(() => {
    const edges: Edge[] = []

    // Emotional edges (behind)
    for (const rel of Object.values(emotionalRels)) {
      const style = EMOTIONAL_EDGE_STYLES[rel.type] || EMOTIONAL_EDGE_STYLES.normal
      const srcSnap = rel.route?.sourceHandle || 'top-center'
      const tgtSnap = rel.route?.targetHandle || 'bottom-center'

      edges.push({
        id: `emo-${rel.id}`,
        source: rel.person1Id,
        target: rel.person2Id,
        sourceHandle: toSnapId(srcSnap),
        targetHandle: toSnapId(tgtSnap),
        type: 'genogram',
        zIndex: 1,
        data: {
          edgeKind: 'emotional',
          relId: rel.id,
          relType: rel.type,
          isDirected: rel.isDirected,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.strokeDasharray,
          pattern: style.pattern,
          lineCount: style.lineCount,
          markerEnd: style.markerEnd,
          label: style.label,
          waypoints: rel.route?.waypoints || [],
          labelOffset: rel.route?.labelOffset,
        },
      })
    }

    // Structural edges — use person1 as source, person2 as target (no swapping)
    for (const rel of Object.values(structuralRels)) {
      const p1Pos = nodePositions[rel.person1Id]
      const p2Pos = nodePositions[rel.person2Id]

      const style = STRUCTURAL_EDGE_STYLES[rel.type] || STRUCTURAL_EDGE_STYLES.marriage
      const srcSnap = rel.route?.sourceHandle || 'right-center'
      const tgtSnap = rel.route?.targetHandle || 'left-center'

      edges.push({
        id: `struct-${rel.id}`,
        source: rel.person1Id,
        target: rel.person2Id,
        sourceHandle: toSnapId(srcSnap),
        targetHandle: toSnapId(tgtSnap),
        type: 'genogram',
        zIndex: 2,
        data: {
          edgeKind: 'structural',
          relId: rel.id,
          relType: rel.type,
          startDate: rel.startDate,
          endDate: rel.endDate,
          slashes: style.slashes,
          strokeDasharray: style.strokeDasharray,
          label: [rel.startDate, rel.endDate].filter(Boolean).join(' - ') || style.label,
          waypoints: rel.route?.waypoints || [],
          labelOffset: rel.route?.labelOffset,
        },
      })

      // Child edges
      if (rel.children.length > 0 && p1Pos && p2Pos) {
        // Compute couple line endpoints from stored handles
        const srcX = p1Pos.x + (HANDLE_POS[srcSnap]?.x || 86)
        const tgtX = p2Pos.x + (HANDLE_POS[tgtSnap]?.x || 34)
        const lineLeftX = Math.min(srcX, tgtX)
        const lineRightX = Math.max(srcX, tgtX)
        const coupleLineY = (p1Pos.y + p2Pos.y) / 2 + 30

        for (const child of rel.children) {
          if (!nodePositions[child.childId]) continue
          const t = child.attachmentT ?? 0.5
          const attachX = lineLeftX + (lineRightX - lineLeftX) * t

          // Default waypoints: T-junction pattern
          // From attachment point → down to sibling bar → to child
          const childPos = nodePositions[child.childId]
          const barY = coupleLineY + 80
          const defaultWaypoints = [
            { x: attachX, y: coupleLineY },  // on couple line
            { x: attachX, y: barY },          // drop down
            { x: childPos.x + 60, y: barY }, // horizontal to child center
          ]

          // Use stored waypoints from the structural rel's route or defaults
          // Child edges share the parent structural rel's route storage
          // For simplicity, child waypoints are computed fresh each time
          // (user can adjust via the drag handles)

          edges.push({
            id: `child-${rel.id}-${child.childId}`,
            source: rel.person1Id,
            target: child.childId,
            sourceHandle: toSnapId(srcSnap),
            targetHandle: toSnapId('top-center'),
            type: 'genogram',
            zIndex: 3,
            data: {
              edgeKind: 'child',
              relId: rel.id,
              relType: child.type,
              connectionType: child.type,
              coupleLineY,
              coupleMidX: attachX,
              attachmentT: t,
              label: '',
              waypoints: defaultWaypoints,
              strokeDasharray: child.type === 'foster' ? '6 4' : child.type === 'adopted' ? '12 4 4 4' : undefined,
            },
          })
        }
      }
    }

    return edges
  }, [structuralRels, emotionalRels, nodePositions])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => { setNodes(flowNodes) }, [flowNodes, setNodes])
  useEffect(() => {
    const seen = new Set<string>()
    const unique = flowEdges.filter((e) => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })
    setEdges(unique)
  }, [flowEdges, setEdges])

  const onNodeDragStop: OnNodeDrag = useCallback((_, node) => {
    setNodePosition(node.id, { x: node.position.x, y: node.position.y })
  }, [setNodePosition])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (ui.isAddingRelationship && ui.relationshipSourceId) {
      const targetId = node.id
      const sourceId = ui.relationshipSourceId
      if (targetId !== sourceId) {
        if (ui.addRelationshipType === 'structural') {
          addStructuralRelationship(sourceId, targetId, StructuralRelType.Marriage)
        } else if (ui.addRelationshipType === 'emotional') {
          addEmotionalRelationship(sourceId, targetId, EmotionalRelType.Normal)
        } else if (ui.addRelationshipType === 'child') {
          // If the form specified which family unit (parent has multiple
          // marriages), honor it. Otherwise fall back: use the only
          // existing rel involving the source, or auto-create one.
          let rel = ui.addChildToRelId ? structuralRels[ui.addChildToRelId] : undefined
          if (!rel) {
            const sourceRels = Object.values(structuralRels).filter(
              (r) => r.person1Id === sourceId || r.person2Id === sourceId
            )
            rel = sourceRels[0]
          }
          if (!rel) {
            // No structural relationship exists — auto-create one.
            // Prefer an existing emotional partner; otherwise a same-generation person.
            const emoPartner = Object.values(emotionalRels).find(
              (r) => r.person1Id === sourceId || r.person2Id === sourceId
            )
            const gens = emoPartner ? null : computeGenerations(persons, structuralRels)
            const sourceGen = gens ? gens[sourceId] : 0
            const partnerId = emoPartner
              ? (emoPartner.person1Id === sourceId ? emoPartner.person2Id : emoPartner.person1Id)
              : Object.values(persons).find(
                  (p) => p.id !== sourceId && p.id !== targetId && gens && gens[p.id] === sourceGen
                )?.id
            if (partnerId) {
              const relId = addStructuralRelationship(sourceId, partnerId, StructuralRelType.Cohabitation)
              rel = useGenogramStore.getState().structuralRelationships[relId]
            }
          }
          if (rel) addChildToRelationship(rel.id, targetId, ChildConnectionType.Biological)
        }
      }
      cancelAddingRelationship()
    } else if (ui.isPresentationMode) {
      // In presentation mode, navigate to the clicked person
      const idx = (presentationOrder.length > 0 ? presentationOrder : Object.keys(persons)).indexOf(node.id)
      if (idx >= 0) setPresentationIndex(idx)
    } else {
      openPersonPanel(node.id)
    }
  }, [ui, openPersonPanel, addStructuralRelationship, addEmotionalRelationship, addChildToRelationship, cancelAddingRelationship, structuralRels, persons, presentationOrder, setPresentationIndex])

  const onPaneClick = useCallback(() => {
    if (ui.isAddingRelationship) cancelAddingRelationship()
    else selectPerson(null)
  }, [ui.isAddingRelationship, cancelAddingRelationship, selectPerson])

  // Drag from snap point to snap point creates a structural relationship by
  // default. Users switch type via the edge menu. Skips if a structural rel
  // already exists between the same pair.
  const onConnect: OnConnect = useCallback((connection) => {
    const { source, target, sourceHandle, targetHandle } = connection
    if (!source || !target || source === target) return

    // Dedupe: don't create a second structural rel between the same pair
    const existing = Object.values(structuralRels).find(
      (r) => (r.person1Id === source && r.person2Id === target) ||
             (r.person1Id === target && r.person2Id === source)
    )
    if (existing) return

    const srcSnap = sourceHandle ? toSnapId(sourceHandle) : 'right-center'
    const tgtSnap = targetHandle ? toSnapId(targetHandle) : 'left-center'

    const relId = addStructuralRelationship(source, target, StructuralRelType.Marriage)
    useGenogramStore.getState().updateEdgeRoute('structural', relId, {
      sourceHandle: srcSnap,
      targetHandle: tgtSnap,
    })
  }, [addStructuralRelationship, structuralRels])

  const isDark = useGenogramStore((s) => s.ui.isDarkMode)

  return (
    <div className="w-full h-full" style={{ backgroundColor: 'var(--canvas-bg)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid={true}
        snapGrid={SNAP_GRID}
        connectionMode={ConnectionMode.Loose}
        fitView
        proOptions={{ hideAttribution: true }}
        className={ui.isAddingRelationship ? 'cursor-crosshair' : ''}
        style={{ backgroundColor: 'var(--canvas-bg)' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={isDark ? 0.8 : 1}
          color={isDark ? '#334155' : '#cbd5e1'}
        />
        {!ui.isPresentationMode && (
          <Controls
            showInteractive={false}
            style={{
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          />
        )}
        {!ui.isPresentationMode && (
          <MiniMap
            nodeColor={(node) => {
              const person = persons[node.id]
              if (!person) return isDark ? '#475569' : '#94a3b8'
              if (person.isDeceased) return isDark ? '#6b7280' : '#9ca3af'
              if (person.gender === 'male') return isDark ? '#60a5fa' : '#3b82f6'
              if (person.gender === 'female') return isDark ? '#f472b6' : '#ec4899'
              return isDark ? '#a78bfa' : '#8b5cf6'
            }}
            maskColor={isDark ? 'rgba(15,23,42,0.6)' : 'rgba(241,245,249,0.7)'}
            style={{
              backgroundColor: isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)',
            }}
            pannable
            zoomable
          />
        )}
      </ReactFlow>
    </div>
  )
}
