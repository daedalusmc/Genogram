import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { PersonSymbol } from './PersonSymbol'
import type { Person } from '../../types/person'
import { useGenogramStore } from '../../store/genogramStore'

export type PersonNodeData = {
  person: Person
}

type PersonNodeType = Node<PersonNodeData, 'person'>

/*
  Symbol is 60px SVG, centered in 120px container (30px offset).
  Container center = (60, 30). SVG offset = 30px from left.

  Square: SVG (4,4)-(56,56) → container (34,4)-(86,56)
  Circle: center (60,30), radius 26
  Snap points must sit ON the actual shape perimeter.
*/

// Container: 120px wide. SVG: 60px centered (offset 30px).
// Shape center in container coords: (60, 30)
const CX = 60
const CY = 30
const R = 26 // radius for circle, half-size for square

type SnapPoint = { id: string; pos: Position; left: number; top: number; label: string }

function getSnapPoints(gender: string): SnapPoint[] {
  const isCircular = ['female', 'trans-mtf', 'lesbian'].includes(gender)
  const isDiamond = ['unknown', 'pet'].includes(gender)
  const isNonBinary = gender === 'non-binary'

  if (isCircular) {
    // Circle perimeter at 45° intervals
    const p = (deg: number) => ({
      left: Math.round(CX + R * Math.cos(deg * Math.PI / 180)),
      top: Math.round(CY - R * Math.sin(deg * Math.PI / 180)),
    })
    return [
      { id: 'top-center',    pos: Position.Top,    ...p(90),   label: 'T' },
      { id: 'top-right',     pos: Position.Top,    ...p(45),   label: 'TR' },
      { id: 'right-center',  pos: Position.Right,  ...p(0),    label: 'R' },
      { id: 'bottom-right',  pos: Position.Bottom, ...p(-45),  label: 'BR' },
      { id: 'bottom-center', pos: Position.Bottom, ...p(-90),  label: 'B' },
      { id: 'bottom-left',   pos: Position.Bottom, ...p(-135), label: 'BL' },
      { id: 'left-center',   pos: Position.Left,   ...p(180),  label: 'L' },
      { id: 'top-left',      pos: Position.Top,    ...p(135),  label: 'TL' },
    ]
  }

  if (isDiamond) {
    // Diamond: SVG rect(8,8,44,44) rotated 45° around (30,30) with overflow:visible
    // Half-side = 22, half-diagonal = 22*sqrt(2) ≈ 31
    // Vertices (tips) at distance 31 from center along axes
    // Edge midpoints at distance 22 from center at 45° angles
    const V = 31 // vertex distance (half-diagonal)
    const E = 22 // edge midpoint distance
    return [
      { id: 'top-center',    pos: Position.Top,    left: CX,       top: CY - V,  label: 'T' },
      { id: 'top-right',     pos: Position.Top,    left: CX + E,   top: CY - E,  label: 'TR' },
      { id: 'right-center',  pos: Position.Right,  left: CX + V,   top: CY,      label: 'R' },
      { id: 'bottom-right',  pos: Position.Bottom, left: CX + E,   top: CY + E,  label: 'BR' },
      { id: 'bottom-center', pos: Position.Bottom, left: CX,       top: CY + V,  label: 'B' },
      { id: 'bottom-left',   pos: Position.Bottom, left: CX - E,   top: CY + E,  label: 'BL' },
      { id: 'left-center',   pos: Position.Left,   left: CX - V,   top: CY,      label: 'L' },
      { id: 'top-left',      pos: Position.Top,    left: CX - E,   top: CY - E,  label: 'TL' },
    ]
  }

  if (isNonBinary) {
    // D-shape: flat left side (square edge at SVG x=4 → container x=34),
    // curved right side (semicircle, center CX, radius R)
    // The path is: M 34,4 → L 60,4 → arc to 60,56 → L 34,56 → Z
    // So top edge is flat at y=4, bottom at y=56, left at x=34
    // Right side follows circle perimeter from (60,4) around to (60,56)
    const L = CX - R  // 34
    const p = (deg: number) => ({
      left: Math.round(CX + R * Math.cos(deg * Math.PI / 180)),
      top: Math.round(CY - R * Math.sin(deg * Math.PI / 180)),
    })
    return [
      { id: 'top-center',    pos: Position.Top,    left: CX, top: CY - R, label: 'T' },  // top center where flat meets arc
      { id: 'top-left',      pos: Position.Top,    left: L,   top: CY - R, label: 'TL' },  // top-left corner
      { id: 'top-right',     pos: Position.Top,    ...p(45),  label: 'TR' },  // 45° on arc
      { id: 'right-center',  pos: Position.Right,  ...p(0),   label: 'R' },   // rightmost point of arc
      { id: 'bottom-right',  pos: Position.Bottom, ...p(-45), label: 'BR' },  // -45° on arc
      { id: 'bottom-center', pos: Position.Bottom, left: CX, top: CY + R, label: 'B' },  // bottom center where flat meets arc
      { id: 'bottom-left',   pos: Position.Bottom, left: L,   top: CY + R, label: 'BL' },  // bottom-left corner
      { id: 'left-center',   pos: Position.Left,   left: L,   top: CY,     label: 'L' },   // center of flat left edge
    ]
  }

  // Square / default (male, trans-ftm, gay-male, etc.)
  const L = CX - R
  const Ri = CX + R
  const T = CY - R
  const B = CY + R
  return [
    { id: 'top-center',    pos: Position.Top,    left: CX, top: T,  label: 'T' },
    { id: 'top-left',      pos: Position.Top,    left: L,  top: T,  label: 'TL' },
    { id: 'top-right',     pos: Position.Top,    left: Ri, top: T,  label: 'TR' },
    { id: 'bottom-center', pos: Position.Bottom, left: CX, top: B,  label: 'B' },
    { id: 'bottom-left',   pos: Position.Bottom, left: L,  top: B,  label: 'BL' },
    { id: 'bottom-right',  pos: Position.Bottom, left: Ri, top: B,  label: 'BR' },
    { id: 'left-center',   pos: Position.Left,   left: L,  top: CY, label: 'L' },
    { id: 'right-center',  pos: Position.Right,  left: Ri, top: CY, label: 'R' },
  ]
}


function PersonNodeComponent({ data, selected }: NodeProps<PersonNodeType>) {
  const { person } = data
  const isPresentationMode = useGenogramStore((s) => s.ui.isPresentationMode)
  const presentationIndex = useGenogramStore((s) => s.ui.presentationIndex)
  const presentationOrder = useGenogramStore((s) => s.presentationOrder)
  const isHighlighted = isPresentationMode && presentationOrder[presentationIndex] === person.id

  const formatDate = (date: string | null) => {
    if (!date) return ''
    try {
      const d = new Date(date)
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
    } catch {
      return date
    }
  }

  const snapPoints = getSnapPoints(person.gender)

  return (
    <div className="flex flex-col items-center cursor-pointer group/node" style={{ width: 120, position: 'relative' }}>

      {/* Snap point handles - source type (drag FROM these) */}
      {snapPoints.map((sp) => (
        <Handle
          key={`src-${sp.id}`}
          type="source"
          position={sp.pos}
          id={sp.id}
          className="!w-2 !h-2 !border-none !rounded-full !opacity-15 hover:!opacity-90 hover:!scale-150 transition-all duration-150"
          style={{ left: sp.left, top: sp.top, transform: 'translate(-50%, -50%)', backgroundColor: 'var(--accent)' }}
          isConnectable={true}
        />
      ))}
      {/* Snap point handles - target type (drag TO these) */}
      {snapPoints.map((sp) => (
        <Handle
          key={`tgt-${sp.id}`}
          type="target"
          position={sp.pos}
          id={`${sp.id}-tgt`}
          className="!w-2 !h-2 !border-none !rounded-full !opacity-0 hover:!opacity-70 hover:!scale-150 transition-all duration-150"
          style={{ left: sp.left, top: sp.top, transform: 'translate(-50%, -50%)', backgroundColor: 'var(--accent)' }}
          isConnectable={true}
        />
      ))}

      {/* No alias handles - edges use snap point IDs directly */}

      {/* Symbol with subtle drop shadow */}
      <div style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>
        <PersonSymbol person={person} isSelected={selected} isHighlighted={isHighlighted} />
      </div>

      {/* Name label — pill style */}
      <div className="text-center mt-1.5 max-w-[120px]">
        <div className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold leading-tight truncate max-w-full"
          style={{
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-subtle)',
          }}>
          {person.name || 'Unknown'}
        </div>
        {(person.dateOfBirth || person.dateOfDeath) && (
          <div className="text-[9px] mt-0.5 leading-tight"
            style={{ color: 'var(--text-muted)' }}>
            {person.dateOfBirth && `b. ${formatDate(person.dateOfBirth)}`}
            {person.dateOfBirth && person.dateOfDeath && ' · '}
            {person.dateOfDeath && `d. ${formatDate(person.dateOfDeath)}`}
          </div>
        )}
      </div>

      {/* Presentation info card */}
      {isHighlighted && (
        <div className="absolute -bottom-28 left-1/2 -translate-x-1/2 rounded-xl p-3 min-w-[200px] z-50 backdrop-blur-sm"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            color: 'var(--text-primary)',
            animation: 'slideInUp 0.2s ease-out',
          }}>
          <div className="font-bold text-sm">{person.name || 'Unknown'}</div>
          {person.dateOfBirth && <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Born: {formatDate(person.dateOfBirth)}</div>}
          {person.isDeceased && person.dateOfDeath && <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Died: {formatDate(person.dateOfDeath)}</div>}
          {person.notes && <div className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>{person.notes}</div>}
          {person.labels.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {person.labels.map((l) => (
                <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>{l}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const PersonNodeMemo = memo(PersonNodeComponent)
