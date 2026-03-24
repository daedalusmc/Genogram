import { useCallback, useEffect, useMemo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useGenogramStore } from '../../store/genogramStore'
import { PersonDetailPanel } from './PersonDetailPanel'

const PANEL_WIDTH = 400
const PADDING = 60
const MIN_ZOOM = 0.5
const MAX_ZOOM = 1.8
const SINGLE_ZOOM = 1.2
const NODE_W = 120
const NODE_H = 90

export function PresentationMode() {
  const ui = useGenogramStore((s) => s.ui)
  const persons = useGenogramStore((s) => s.persons)
  const presentationOrder = useGenogramStore((s) => s.presentationOrder)
  const togglePresentationMode = useGenogramStore((s) => s.togglePresentationMode)
  const setPresentationIndex = useGenogramStore((s) => s.setPresentationIndex)
  const title = useGenogramStore((s) => s.title)
  const nodePositions = useGenogramStore((s) => s.nodePositions)
  const structuralRels = useGenogramStore((s) => s.structuralRelationships)
  const { fitView, setViewport } = useReactFlow()

  const order = useMemo(() =>
    presentationOrder.length > 0 ? presentationOrder : Object.keys(persons),
    [presentationOrder, persons]
  )

  const currentPersonId = order[ui.presentationIndex]
  const currentPerson = currentPersonId ? persons[currentPersonId] : null

  // Collect all directly related person IDs (family cluster)
  const getRelatedPersonIds = useCallback((personId: string): Set<string> => {
    const related = new Set<string>([personId])

    for (const rel of Object.values(structuralRels)) {
      // Partners and children from structural relationships involving this person
      if (rel.person1Id === personId || rel.person2Id === personId) {
        related.add(rel.person1Id)
        related.add(rel.person2Id)
        for (const child of rel.children) {
          related.add(child.childId)
        }
      }
      // Parents: if this person is a child in any structural relationship
      if (rel.children.some((c) => c.childId === personId)) {
        related.add(rel.person1Id)
        related.add(rel.person2Id)
      }
    }

    return related
  }, [structuralRels])

  // Compute bounding box of a set of person nodes
  const getBoundingBox = useCallback((personIds: Set<string>) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const id of personIds) {
      const pos = nodePositions[id]
      if (!pos) continue
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + NODE_W)
      maxY = Math.max(maxY, pos.y + NODE_H)
    }

    if (minX === Infinity) return null
    return { minX, minY, maxX, maxY }
  }, [nodePositions])

  // Smart centering: fit the family cluster in the visible area left of the panel
  useEffect(() => {
    if (!ui.isPresentationMode || ui.presentationIndex < 0) return
    const personId = order[ui.presentationIndex]
    if (!personId) return

    // Get container dimensions
    const rfContainer = document.querySelector('.react-flow') as HTMLElement | null
    const containerW = rfContainer?.clientWidth ?? window.innerWidth
    const containerH = rfContainer?.clientHeight ?? window.innerHeight

    const relatedIds = getRelatedPersonIds(personId)
    const bbox = getBoundingBox(relatedIds)
    if (!bbox) return

    // Visual center of the available area (left of panel)
    const visualCenterX = (containerW - PANEL_WIDTH) / 2
    const visualCenterY = containerH / 2

    // Single person: use fixed zoom
    if (relatedIds.size === 1) {
      const pos = nodePositions[personId]
      if (!pos) return
      const vpX = visualCenterX - (pos.x + NODE_W / 2) * SINGLE_ZOOM
      const vpY = visualCenterY - (pos.y + NODE_H / 2) * SINGLE_ZOOM
      setViewport({ x: vpX, y: vpY, zoom: SINGLE_ZOOM }, { duration: 500 })
      return
    }

    // Multiple related people: compute zoom to fit bounding box
    const availableW = containerW - PANEL_WIDTH - (PADDING * 2)
    const availableH = containerH - (PADDING * 2)
    const bboxW = bbox.maxX - bbox.minX
    const bboxH = bbox.maxY - bbox.minY

    let zoom = Math.min(
      availableW / Math.max(bboxW, 1),
      availableH / Math.max(bboxH, 1)
    )
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))

    // Center the bounding box in the visible area
    const bboxCenterX = (bbox.minX + bbox.maxX) / 2
    const bboxCenterY = (bbox.minY + bbox.maxY) / 2

    const vpX = visualCenterX - bboxCenterX * zoom
    const vpY = visualCenterY - bboxCenterY * zoom

    setViewport({ x: vpX, y: vpY, zoom }, { duration: 500 })
  }, [ui.presentationIndex, ui.isPresentationMode, order, nodePositions, structuralRels, getRelatedPersonIds, getBoundingBox, setViewport])

  const goNext = useCallback(() => {
    const nextIndex = Math.min(ui.presentationIndex + 1, order.length - 1)
    setPresentationIndex(nextIndex)
  }, [ui.presentationIndex, order.length, setPresentationIndex])

  const goPrev = useCallback(() => {
    const prevIndex = Math.max(ui.presentationIndex - 1, 0)
    setPresentationIndex(prevIndex)
  }, [ui.presentationIndex, setPresentationIndex])

  const showAll = useCallback(() => {
    fitView({ padding: 0.2, duration: 600 })
    setPresentationIndex(-1)
  }, [fitView, setPresentationIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!ui.isPresentationMode) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'Escape') {
        togglePresentationMode()
      } else if (e.key === 'f') {
        showAll()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [ui.isPresentationMode, goNext, goPrev, togglePresentationMode, showAll])

  if (!ui.isPresentationMode) return null

  const isDark = ui.isDarkMode

  return (
    <>
      {/* Top gradient bar */}
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to bottom, rgba(15,23,42,0.8) 0%, transparent 100%)'
            : 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
          padding: '16px 24px',
        }}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white drop-shadow-lg tracking-tight">{title}</h1>
          <div className="text-white/60 text-xs font-medium tracking-wider">
            {ui.presentationIndex >= 0
              ? `${ui.presentationIndex + 1} / ${order.length}`
              : 'OVERVIEW'
            }
          </div>
        </div>
      </div>

      {/* Right detail panel — slides in when a person is selected */}
      {currentPerson && ui.presentationIndex >= 0 && (
        <PersonDetailPanel
          person={currentPerson}
          onClose={showAll}
        />
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2"
        style={{ animation: 'fadeIn 0.3s ease-out' }}>

        <div className="flex items-center gap-1 p-1 rounded-full backdrop-blur-xl"
          style={{
            backgroundColor: isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}>
          <ControlBtn onClick={goPrev} disabled={ui.presentationIndex <= 0}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </ControlBtn>

          <ControlBtn onClick={showAll}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </ControlBtn>

          <ControlBtn onClick={goNext} disabled={ui.presentationIndex >= order.length - 1}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </ControlBtn>
        </div>

        {/* Exit button */}
        <button
          onClick={togglePresentationMode}
          className="px-4 py-2 rounded-full text-xs font-semibold text-white transition-all backdrop-blur-xl"
          style={{
            backgroundColor: 'rgba(239,68,68,0.85)',
            boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
          }}
        >
          Exit
        </button>
      </div>
    </>
  )
}

function ControlBtn({ children, onClick, disabled }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 flex items-center justify-center rounded-full transition-all disabled:opacity-20"
      style={{ color: 'var(--text-primary)' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {children}
    </button>
  )
}
