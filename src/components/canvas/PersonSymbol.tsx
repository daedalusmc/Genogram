import { Gender, PregnancyType, CONDITION_COLORS, LABEL_COLORS } from '../../types/enums'
import type { Person } from '../../types/person'

const SIZE = 60
const HALF = SIZE / 2

interface Props {
  person: Person
  isSelected?: boolean
  isHighlighted?: boolean
}

export function PersonSymbol({ person, isSelected, isHighlighted }: Props) {
  const { gender, isDeceased, pregnancyType, photo, conditions } = person

  // Pregnancy shapes disabled until UI toggle exists
  // if (pregnancyType) {
  //   return (
  //     <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
  //       <PregnancyShape type={pregnancyType} />
  //       {isSelected && <SelectionRing shape="triangle" />}
  //     </svg>
  //   )
  // }

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} overflow="visible">
      <defs>
        <clipPath id={`photo-clip-${person.id}`}>
          <GenderClipPath gender={gender} />
        </clipPath>
        <clipPath id={`shape-clip-${person.id}`}>
          <GenderClipPath gender={gender} />
        </clipPath>
      </defs>

      {/* Highlight glow */}
      {isHighlighted && <HighlightGlow gender={gender} />}

      {/* 1. Photo BEHIND everything - semi-transparent */}
      {photo && (
        <image
          href={photo}
          x={4} y={4}
          width={SIZE - 8} height={SIZE - 8}
          clipPath={`url(#photo-clip-${person.id})`}
          preserveAspectRatio="xMidYMid slice"
          opacity={0.25}
        />
      )}

      {/* 2. Base shape with white fill */}
      <GenderShape gender={gender} fill={photo ? 'rgba(255,255,255,0.6)' : 'var(--node-fill, white)'} stroke="none" strokeWidth={0} />

      {/* 3. Multiple condition color stripes - each condition gets a horizontal band */}
      {conditions.length > 0 && (
        <g clipPath={`url(#shape-clip-${person.id})`}>
          {conditions.map((cond, i) => {
            // Place bands within the shape interior (4px inset on each side)
            const inset = 4
            const innerHeight = SIZE - inset * 2
            const bandHeight = innerHeight / conditions.length
            const y = inset + i * bandHeight
            const color = CONDITION_COLORS[cond.type]
            return (
              <rect
                key={cond.type}
                x={0}
                y={y}
                width={SIZE}
                height={bandHeight}
                fill={color}
                opacity={0.5}  /* suspected toggle disabled until UI exists */
              />
            )
          })}
          {/* Recovery arrow — disabled until UI toggle exists
          {conditions.some((c) => c.inRecovery) && (
            <g>
              <line x1={HALF - 12} y1={SIZE - 8} x2={HALF + 12} y2={8} stroke="white" strokeWidth={2} opacity={0.85} />
              <polygon points={`${HALF + 12},${8} ${HALF + 6},${10} ${HALF + 10},${14}`} fill="white" opacity={0.85} />
            </g>
          )} */}
        </g>
      )}

      {/* 4. Photo semi-transparent on top */}
      {photo && (
        <image
          href={photo}
          x={6} y={6}
          width={SIZE - 12} height={SIZE - 12}
          clipPath={`url(#photo-clip-${person.id})`}
          preserveAspectRatio="xMidYMid slice"
          opacity={0.35}
        />
      )}

      {/* 5. Stroke outline always visible on top */}
      <GenderShape gender={gender} fill="none" stroke="var(--node-stroke, #374151)" strokeWidth={2.5} />

      {/* 6. Deceased X on top — clipped to shape bounds */}
      {isDeceased && (
        <g clipPath={`url(#photo-clip-${person.id})`}>
          <DeceasedX />
        </g>
      )}

      {/* 7. Selection ring */}
      {isSelected && <SelectionRing shape={getShape(gender)} />}

      {/* 8. Color-coded labels - centered above entity, wrapping to shape width */}
      {person.labels.length > 0 && (
        <g>
          {(() => {
            const badgeW = 20
            const badgeH = 11
            const gap = 2
            const maxPerRow = Math.floor(SIZE / (badgeW + gap)) || 1
            const rows: string[][] = []
            for (let i = 0; i < person.labels.length; i += maxPerRow) {
              rows.push(person.labels.slice(i, i + maxPerRow))
            }
            return rows.map((row, ri) => {
              const rowWidth = row.length * (badgeW + gap) - gap
              const startX = (SIZE - rowWidth) / 2
              const y = -(rows.length - ri) * (badgeH + 2)
              return row.map((label, ci) => {
                const color = LABEL_COLORS[label] || '#dc2626'
                const x = startX + ci * (badgeW + gap)
                return (
                  <g key={label}>
                    <rect x={x} y={y} width={badgeW} height={badgeH} fill={color} rx={2} opacity={0.9} />
                    <text x={x + badgeW / 2} y={y + 8} fontSize={7} fontWeight="bold" fill="white"
                      fontFamily="sans-serif" textAnchor="middle">
                      {label}
                    </text>
                  </g>
                )
              })
            })
          })()}
        </g>
      )}
    </svg>
  )
}

function GenderShape({ gender, fill, stroke, strokeWidth, opacity }: {
  gender: Gender; fill: string; stroke: string; strokeWidth: number; opacity?: number
}) {
  const common = { fill, stroke, strokeWidth, opacity }

  switch (gender) {
    case Gender.Male:
      return <rect x={4} y={4} width={SIZE - 8} height={SIZE - 8} {...common} />
    case Gender.Female:
      return <circle cx={HALF} cy={HALF} r={HALF - 4} {...common} />
    case Gender.Unknown:
      return (
        <g>
          <rect x={8} y={8} width={SIZE - 16} height={SIZE - 16} transform={`rotate(45 ${HALF} ${HALF})`} {...common} />
          <text x={HALF} y={HALF + 4} textAnchor="middle" fontSize={14} fill="var(--node-stroke, #374151)" fontFamily="sans-serif">?</text>
        </g>
      )
    case Gender.Pet:
      return <rect x={8} y={8} width={SIZE - 16} height={SIZE - 16} transform={`rotate(45 ${HALF} ${HALF})`} {...common} />
    case Gender.NonBinary:
      // Half square left + half circle right as ONE continuous path (no center line)
      // Start top-left → top-center → arc to bottom-center → bottom-left → close
      return (
        <path
          d={`M ${4} ${4} L ${HALF} ${4} A ${HALF - 4} ${HALF - 4} 0 0 1 ${HALF} ${SIZE - 4} L ${4} ${SIZE - 4} Z`}
          {...common}
        />
      )
    case Gender.TransFtoM:
      return (
        <g>
          <rect x={4} y={4} width={SIZE - 8} height={SIZE - 8} {...common} />
          <circle cx={HALF} cy={HALF} r={HALF - 12} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      )
    case Gender.TransMtoF:
      return (
        <g>
          <circle cx={HALF} cy={HALF} r={HALF - 4} {...common} />
          <rect x={12} y={12} width={SIZE - 24} height={SIZE - 24} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      )
    case Gender.GayMale:
      return (
        <g>
          <rect x={4} y={4} width={SIZE - 8} height={SIZE - 8} {...common} />
          <polygon points={`${HALF},${SIZE - 14} ${14},${14} ${SIZE - 14},${14}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      )
    case Gender.Lesbian:
      return (
        <g>
          <circle cx={HALF} cy={HALF} r={HALF - 4} {...common} />
          <polygon points={`${HALF},${SIZE - 14} ${14},${14} ${SIZE - 14},${14}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      )
    default:
      return <rect x={4} y={4} width={SIZE - 8} height={SIZE - 8} {...common} />
  }
}

function GenderClipPath({ gender }: { gender: Gender }) {
  switch (gender) {
    case Gender.Female:
    case Gender.TransMtoF:
    case Gender.Lesbian:
      return <circle cx={HALF} cy={HALF} r={HALF - 4} />
    case Gender.Pet:
    case Gender.Unknown:
      return <rect x={8} y={8} width={SIZE - 16} height={SIZE - 16} transform={`rotate(45 ${HALF} ${HALF})`} />
    case Gender.NonBinary:
      // Half square left + half circle right clip path
      return (
        <path
          d={`M ${4} ${4} L ${HALF} ${4} A ${HALF - 4} ${HALF - 4} 0 0 1 ${HALF} ${SIZE - 4} L ${4} ${SIZE - 4} Z`}
        />
      )
    default:
      return <rect x={4} y={4} width={SIZE - 8} height={SIZE - 8} />
  }
}

function DeceasedX() {
  return (
    <g stroke="var(--node-stroke, #374151)" strokeWidth={2.5}>
      <line x1={4} y1={4} x2={SIZE - 4} y2={SIZE - 4} />
      <line x1={SIZE - 4} y1={4} x2={4} y2={SIZE - 4} />
    </g>
  )
}

function PregnancyShape({ type }: { type: PregnancyType }) {
  // UPWARD-pointing triangle (point at top, base at bottom)
  // Keeps inverted/downward triangle exclusively for Gay/Lesbian symbols
  const trianglePoints = `${HALF},${8} ${8},${SIZE - 8} ${SIZE - 8},${SIZE - 8}`
  switch (type) {
    case PregnancyType.Pregnancy:
      return <polygon points={trianglePoints} fill="var(--node-fill, white)" stroke="var(--node-stroke, #374151)" strokeWidth={2} />
    case PregnancyType.Miscarriage:
      return (
        <g>
          <polygon points={trianglePoints} fill="var(--node-fill, white)" stroke="var(--node-stroke, #374151)" strokeWidth={2} />
          <line x1={14} y1={14} x2={SIZE - 14} y2={SIZE - 14} stroke="var(--node-stroke, #374151)" strokeWidth={2} />
          <line x1={SIZE - 14} y1={14} x2={14} y2={SIZE - 14} stroke="var(--node-stroke, #374151)" strokeWidth={2} />
        </g>
      )
    case PregnancyType.Abortion:
      return (
        <g>
          <polygon points={trianglePoints} fill="var(--node-stroke, #374151)" stroke="var(--node-stroke, #374151)" strokeWidth={2} />
          <line x1={14} y1={18} x2={SIZE - 14} y2={SIZE - 14} stroke="white" strokeWidth={2} />
          <line x1={SIZE - 14} y1={18} x2={14} y2={SIZE - 14} stroke="white" strokeWidth={2} />
        </g>
      )
    case PregnancyType.Stillborn:
      return (
        <g>
          <polygon points={trianglePoints} fill="var(--node-fill, white)" stroke="var(--node-stroke, #374151)" strokeWidth={2} />
          <line x1={HALF} y1={12} x2={14} y2={SIZE - 10} stroke="var(--node-stroke, #374151)" strokeWidth={2} />
          <line x1={HALF} y1={12} x2={SIZE - 14} y2={SIZE - 10} stroke="var(--node-stroke, #374151)" strokeWidth={2} />
          <line x1={14} y1={SIZE - 10} x2={SIZE - 14} y2={SIZE - 10} stroke="var(--node-stroke, #374151)" strokeWidth={2} />
        </g>
      )
  }
}

function SelectionRing({ shape }: { shape: string }) {
  if (shape === 'circle') {
    return <circle cx={HALF} cy={HALF} r={HALF - 1} fill="none" stroke="#3b82f6" strokeWidth={3} strokeDasharray="4 2" />
  }
  return <rect x={2} y={2} width={SIZE - 4} height={SIZE - 4} fill="none" stroke="#3b82f6" strokeWidth={3} strokeDasharray="4 2" />
}

function HighlightGlow({ gender }: { gender: Gender }) {
  if (gender === Gender.Female || gender === Gender.TransMtoF || gender === Gender.Lesbian) {
    return <circle cx={HALF} cy={HALF} r={HALF + 2} fill="none" stroke="#fbbf24" strokeWidth={4} opacity={0.6} />
  }
  return <rect x={0} y={0} width={SIZE} height={SIZE} fill="none" stroke="#fbbf24" strokeWidth={4} rx={2} opacity={0.6} />
}

function getShape(gender: Gender): string {
  if (gender === Gender.Female || gender === Gender.TransMtoF || gender === Gender.Lesbian) return 'circle'
  return 'rect'
}
