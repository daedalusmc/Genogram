import { useGenogramStore } from '../../store/genogramStore'
import { CONDITION_COLORS, ConditionType, LABEL_COLORS, LABEL_NAMES } from '../../types/enums'
import { EMOTIONAL_EDGE_STYLES } from '../../constants/relationshipStyles'

export function Legend() {
  const showLegend = useGenogramStore((s) => s.ui.showLegend)
  const toggleLegend = useGenogramStore((s) => s.toggleLegend)

  if (!showLegend) return null

  const strokeColor = 'var(--text-secondary)'

  return (
    <div
      className="absolute top-14 right-4 z-40 max-h-[80vh] overflow-y-auto w-[320px]"
      style={{
        backgroundColor: 'var(--bg-surface)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-lg)',
        padding: '16px',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
          Genogram Legend
        </h3>
        <button
          onClick={toggleLegend}
          className="w-6 h-6 flex items-center justify-center rounded-full text-sm transition-colors"
          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)' }}
        >
          &times;
        </button>
      </div>

      {/* Person Symbols */}
      <LegendSection title="People">
        <div className="grid grid-cols-2 gap-2">
          <SymbolItem label="Male">
            <svg width="16" height="16"><rect x="2" y="2" width="12" height="12" fill="none" stroke={strokeColor} strokeWidth="1.5" /></svg>
          </SymbolItem>
          <SymbolItem label="Female">
            <svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" /></svg>
          </SymbolItem>
          <SymbolItem label="Unknown / Pet">
            <svg width="16" height="16"><rect x="4" y="4" width="8" height="8" fill="none" stroke={strokeColor} strokeWidth="1.5" transform="rotate(45 8 8)" /></svg>
          </SymbolItem>
          <SymbolItem label="Non-binary">
            <svg width="16" height="16">
              <path d="M 2 2 L 2 14 L 8 14 L 8 2 Z" fill="none" stroke={strokeColor} strokeWidth="1.5" />
              <path d="M 8 2 A 6 6 0 0 1 8 14" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            </svg>
          </SymbolItem>
          <SymbolItem label="Pregnancy">
            <svg width="16" height="16"><polygon points="8,14 2,2 14,2" fill="none" stroke={strokeColor} strokeWidth="1.5" /></svg>
          </SymbolItem>
          <SymbolItem label="Deceased">
            <svg width="16" height="16">
              <rect x="2" y="2" width="12" height="12" fill="none" stroke={strokeColor} strokeWidth="1.5" />
              <line x1="2" y1="2" x2="14" y2="14" stroke={strokeColor} strokeWidth="1.5" />
              <line x1="14" y1="2" x2="2" y2="14" stroke={strokeColor} strokeWidth="1.5" />
            </svg>
          </SymbolItem>
        </div>
      </LegendSection>

      {/* Structural Relationships */}
      <LegendSection title="Family Relationships">
        <div className="space-y-2">
          <LineItem label="Marriage" stroke={strokeColor} strokeWidth={2} />
          <LineItem label="Cohabitation" stroke={strokeColor} strokeWidth={2} dasharray="8 4" />
          <LineItem label="Separation" stroke={strokeColor} strokeWidth={2}>
            <line x1="17" y1="0" x2="23" y2="12" stroke={strokeColor} strokeWidth="2" />
          </LineItem>
          <LineItem label="Divorce" stroke={strokeColor} strokeWidth={2}>
            <line x1="15" y1="0" x2="21" y2="12" stroke={strokeColor} strokeWidth="2" />
            <line x1="19" y1="0" x2="25" y2="12" stroke={strokeColor} strokeWidth="2" />
          </LineItem>
        </div>
      </LegendSection>

      {/* Child Connections */}
      <LegendSection title="Children">
        <div className="space-y-2">
          <LineItem label="Biological" stroke={strokeColor} strokeWidth={2} />
          <LineItem label="Adopted" stroke={strokeColor} strokeWidth={2} dasharray="12 4 4 4" />
          <LineItem label="Foster" stroke={strokeColor} strokeWidth={2} dasharray="6 4" />
        </div>
      </LegendSection>

      {/* Emotional Relationships */}
      <LegendSection title="Emotional Relationships">
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
          {Object.entries(EMOTIONAL_EDGE_STYLES).map(([type, style]) => (
            <div key={type} className="flex items-center gap-2.5">
              <svg width="40" height="8" className="flex-shrink-0">
                <line
                  x1="0" y1="4" x2="40" y2="4"
                  stroke={style.stroke}
                  strokeWidth={Math.min(style.strokeWidth, 2)}
                  strokeDasharray={style.strokeDasharray}
                />
              </svg>
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{style.label}</span>
            </div>
          ))}
        </div>
      </LegendSection>

      {/* Condition Colors */}
      <LegendSection title="Health Conditions">
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(CONDITION_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded flex-shrink-0" style={{
                backgroundColor: color,
                boxShadow: `0 0 4px ${color}40`,
              }} />
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </LegendSection>

      {/* Labels */}
      <LegendSection title="Label Codes" last>
        <div className="space-y-1">
          {Object.keys(LABEL_COLORS).map((code) => {
            const color = LABEL_COLORS[code]
            return (
              <div key={code} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <span
                  className="inline-flex items-center justify-center w-7 px-1 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: color, color: '#fff' }}
                >
                  {code}
                </span>
                <span>{LABEL_NAMES[code]}</span>
              </div>
            )
          })}
        </div>
      </LegendSection>
    </div>
  )
}

function LegendSection({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      paddingBottom: last ? 0 : '10px',
      marginBottom: last ? 0 : '10px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div className="text-[10px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: 'var(--text-muted)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function SymbolItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {children}
      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

function LineItem({ label, stroke, strokeWidth, dasharray, children }: {
  label: string; stroke: string; strokeWidth: number; dasharray?: string; children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="40" height={children ? 12 : 8} className="flex-shrink-0">
        <line x1="0" y1={children ? 6 : 4} x2="40" y2={children ? 6 : 4}
          stroke={stroke} strokeWidth={strokeWidth}
          strokeDasharray={dasharray} />
        {children}
      </svg>
      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}
