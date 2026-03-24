import { useGenogramStore } from '../../store/genogramStore'
import { EMOTIONAL_REL_LABELS, STRUCTURAL_REL_LABELS, CONDITION_COLORS, ConditionType } from '../../types/enums'
import { EMOTIONAL_EDGE_STYLES } from '../../constants/relationshipStyles'

export function Legend() {
  const showLegend = useGenogramStore((s) => s.ui.showLegend)
  const toggleLegend = useGenogramStore((s) => s.toggleLegend)

  if (!showLegend) return null

  return (
    <div className="absolute top-14 right-4 z-40 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 p-4 max-h-[80vh] overflow-y-auto w-[320px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800">Genogram Legend</h3>
        <button onClick={toggleLegend} className="text-gray-400 hover:text-gray-600">&times;</button>
      </div>

      {/* Person Symbols */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">People</h4>
        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <svg width="16" height="16"><rect x="2" y="2" width="12" height="12" fill="none" stroke="#374151" strokeWidth="1.5" /></svg>
            Male
          </div>
          <div className="flex items-center gap-1">
            <svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="none" stroke="#374151" strokeWidth="1.5" /></svg>
            Female
          </div>
          <div className="flex items-center gap-1">
            <svg width="16" height="16"><rect x="4" y="4" width="8" height="8" fill="none" stroke="#374151" strokeWidth="1.5" transform="rotate(45 8 8)" /></svg>
            Unknown/Pet
          </div>
          <div className="flex items-center gap-1">
            <svg width="16" height="16"><polygon points="8,14 2,2 14,2" fill="none" stroke="#374151" strokeWidth="1.5" /></svg>
            Pregnancy
          </div>
          <div className="flex items-center gap-1">
            <svg width="16" height="16">
              <rect x="2" y="2" width="12" height="12" fill="none" stroke="#374151" strokeWidth="1.5" />
              <line x1="2" y1="2" x2="14" y2="14" stroke="#374151" strokeWidth="1.5" />
              <line x1="14" y1="2" x2="2" y2="14" stroke="#374151" strokeWidth="1.5" />
            </svg>
            Deceased
          </div>
        </div>
      </div>

      {/* Structural Relationships */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Family Relationships</h4>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <svg width="40" height="8"><line x1="0" y1="4" x2="40" y2="4" stroke="#374151" strokeWidth="2" /></svg>
            Marriage
          </div>
          <div className="flex items-center gap-2">
            <svg width="40" height="8"><line x1="0" y1="4" x2="40" y2="4" stroke="#374151" strokeWidth="2" strokeDasharray="8 4" /></svg>
            Cohabitation
          </div>
          <div className="flex items-center gap-2">
            <svg width="40" height="12">
              <line x1="0" y1="6" x2="40" y2="6" stroke="#374151" strokeWidth="2" />
              <line x1="17" y1="0" x2="23" y2="12" stroke="#374151" strokeWidth="2" />
            </svg>
            Separation
          </div>
          <div className="flex items-center gap-2">
            <svg width="40" height="12">
              <line x1="0" y1="6" x2="40" y2="6" stroke="#374151" strokeWidth="2" />
              <line x1="15" y1="0" x2="21" y2="12" stroke="#374151" strokeWidth="2" />
              <line x1="19" y1="0" x2="25" y2="12" stroke="#374151" strokeWidth="2" />
            </svg>
            Divorce
          </div>
        </div>
      </div>

      {/* Child Connections */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Children</h4>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <svg width="40" height="8"><line x1="0" y1="4" x2="40" y2="4" stroke="#374151" strokeWidth="2" /></svg>
            Biological
          </div>
          <div className="flex items-center gap-2">
            <svg width="40" height="8"><line x1="0" y1="4" x2="40" y2="4" stroke="#374151" strokeWidth="2" strokeDasharray="12 4 4 4" /></svg>
            Adopted
          </div>
          <div className="flex items-center gap-2">
            <svg width="40" height="8"><line x1="0" y1="4" x2="40" y2="4" stroke="#374151" strokeWidth="2" strokeDasharray="6 4" /></svg>
            Foster
          </div>
        </div>
      </div>

      {/* Emotional Relationships */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Emotional Relationships</h4>
        <div className="space-y-1 text-xs text-gray-600 max-h-[200px] overflow-y-auto">
          {Object.entries(EMOTIONAL_EDGE_STYLES).map(([type, style]) => (
            <div key={type} className="flex items-center gap-2">
              <svg width="40" height="8">
                <line
                  x1="0" y1="4" x2="40" y2="4"
                  stroke={style.stroke}
                  strokeWidth={Math.min(style.strokeWidth, 2)}
                  strokeDasharray={style.strokeDasharray}
                />
              </svg>
              <span>{style.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Condition Colors */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Health Conditions</h4>
        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
          {Object.entries(CONDITION_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              {type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </div>
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="mt-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Label Codes</h4>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-600">
          <div><strong>LD</strong> - Learning Disability</div>
          <div><strong>PD</strong> - Physical Disability</div>
          <div><strong>SD</strong> - Sensory Disability</div>
          <div><strong>MH</strong> - Mental Health</div>
          <div><strong>AM</strong> - Alcohol Misuse</div>
          <div><strong>SM</strong> - Substance Misuse</div>
          <div><strong>D</strong> - Depression</div>
          <div><strong>P</strong> - Prison</div>
          <div><strong>CAR</strong> - Child At Risk</div>
          <div><strong>SI</strong> - Severe Illness</div>
          <div><strong>LI</strong> - Lifelong Illness</div>
          <div><strong>SA</strong> - Sexual Abuse</div>
          <div><strong>PA</strong> - Physical Abuse</div>
          <div><strong>EA</strong> - Emotional Abuse</div>
        </div>
      </div>
    </div>
  )
}
