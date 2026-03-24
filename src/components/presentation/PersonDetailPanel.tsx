import type { Person } from '../../types/person'
import { useGenogramStore } from '../../store/genogramStore'
import {
  CONDITION_COLORS,
  LABEL_COLORS,
  STRUCTURAL_REL_LABELS,
  EMOTIONAL_REL_LABELS,
  GENDER_LABELS,
} from '../../types/enums'

function formatDate(d: string | null): string {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface PersonDetailPanelProps {
  person: Person
  onClose: () => void
}

export function PersonDetailPanel({ person, onClose }: PersonDetailPanelProps) {
  const persons = useGenogramStore((s) => s.persons)
  const structuralRels = useGenogramStore((s) => s.structuralRelationships)
  const emotionalRels = useGenogramStore((s) => s.emotionalRelationships)

  // Find relationships involving this person
  const familyRels = Object.values(structuralRels).filter(
    (r) => r.person1Id === person.id || r.person2Id === person.id
  )
  const emoRels = Object.values(emotionalRels).filter(
    (r) => r.person1Id === person.id || r.person2Id === person.id
  )

  // Find children of this person
  const children = familyRels.flatMap((r) =>
    r.children.map((c) => ({ person: persons[c.childId], type: c.type })).filter((c) => c.person)
  )

  // Find parents
  const parentNames = person.parentIds
    ?.map((id) => persons[id]?.name || 'Unknown')
    .filter(Boolean) || []

  return (
    <div
      className="absolute top-0 right-0 w-[400px] h-full z-50 overflow-y-auto backdrop-blur-xl"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'slideInRight 0.25s ease-out',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-sm z-10 transition-all"
        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}
      >
        &times;
      </button>

      {/* Photo hero */}
      <div className="flex flex-col items-center pt-8 pb-4 px-6"
        style={{ borderBottom: '1px solid var(--border)' }}>
        {person.photo ? (
          <img
            src={person.photo}
            alt={person.name}
            className="w-48 h-48 rounded-2xl object-cover"
            style={{ border: '3px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
          />
        ) : (
          <div className="w-48 h-48 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-hover)', border: '3px solid var(--border)' }}>
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: 'var(--text-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}

        <h2 className="text-xl font-bold tracking-tight mt-4" style={{ color: 'var(--text-primary)' }}>
          {person.name || 'Unknown'}
        </h2>

        <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
          {GENDER_LABELS[person.gender] || person.gender}
          {person.generation > 0 && ` · Gen ${person.generation}`}
        </div>

        {/* Dates */}
        <div className="flex items-center gap-3 mt-2">
          {person.dateOfBirth && (
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Born</span> {formatDate(person.dateOfBirth)}
            </div>
          )}
          {person.isDeceased && person.dateOfDeath && (
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Died</span> {formatDate(person.dateOfDeath)}
            </div>
          )}
        </div>
      </div>

      {/* Content sections */}
      <div className="px-5 py-4 space-y-4">

        {/* Parents */}
        {parentNames.length > 0 && (
          <Section title="Parents">
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {parentNames.join(' & ')}
            </div>
          </Section>
        )}

        {/* Family Relationships */}
        {familyRels.length > 0 && (
          <Section title="Family">
            <div className="space-y-1.5">
              {familyRels.map((rel) => {
                const partnerId = rel.person1Id === person.id ? rel.person2Id : rel.person1Id
                const partner = persons[partnerId]
                return (
                  <RelCard
                    key={rel.id}
                    name={partner?.name || 'Unknown'}
                    photo={partner?.photo || null}
                    label={STRUCTURAL_REL_LABELS[rel.type]}
                    color="var(--accent)"
                  />
                )
              })}
            </div>
          </Section>
        )}

        {/* Children */}
        {children.length > 0 && (
          <Section title="Children">
            <div className="space-y-1.5">
              {children.map((c) => (
                <RelCard
                  key={c.person!.id}
                  name={c.person!.name || 'Unknown'}
                  photo={c.person!.photo || null}
                  label={c.type}
                  color="#22c55e"
                />
              ))}
            </div>
          </Section>
        )}

        {/* Emotional Relationships */}
        {emoRels.length > 0 && (
          <Section title="Emotional">
            <div className="space-y-1.5">
              {emoRels.map((rel) => {
                const otherId = rel.person1Id === person.id ? rel.person2Id : rel.person1Id
                const other = persons[otherId]
                return (
                  <RelCard
                    key={rel.id}
                    name={other?.name || 'Unknown'}
                    photo={other?.photo || null}
                    label={EMOTIONAL_REL_LABELS[rel.type]}
                    color={rel.type.includes('hostile') || rel.type.includes('violence') || rel.type.includes('abuse') ? '#ef4444' : 'var(--accent)'}
                  />
                )
              })}
            </div>
          </Section>
        )}

        {/* Health Conditions */}
        {person.conditions.length > 0 && (
          <Section title="Health Conditions">
            <div className="flex flex-wrap gap-1.5">
              {person.conditions.map((c) => (
                <span
                  key={c.type}
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: CONDITION_COLORS[c.type] + '20',
                    color: CONDITION_COLORS[c.type],
                    border: `1px solid ${CONDITION_COLORS[c.type]}40`,
                  }}
                >
                  {c.type.replace(/([A-Z])/g, ' $1').trim()}
                  {c.inRecovery && ' (recovery)'}
                  {c.suspected && ' (suspected)'}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Labels */}
        {person.labels.length > 0 && (
          <Section title="Labels">
            <div className="flex flex-wrap gap-1.5">
              {person.labels.map((l) => (
                <span
                  key={l}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: (LABEL_COLORS[l] || '#6b7280') + '20',
                    color: LABEL_COLORS[l] || '#6b7280',
                    border: `1px solid ${(LABEL_COLORS[l] || '#6b7280')}40`,
                  }}
                >
                  {l}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Notes */}
        {person.notes && (
          <Section title="Notes">
            <p className="text-sm leading-relaxed italic"
              style={{ color: 'var(--text-secondary)' }}>
              {person.notes}
            </p>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: 'var(--text-muted)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function RelCard({ name, photo, label, color }: {
  name: string; photo: string | null; label: string; color: string
}) {
  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg transition-colors"
      style={{ backgroundColor: 'var(--bg-hover)' }}>
      {photo ? (
        <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover"
          style={{ border: '2px solid var(--border)' }} />
      ) : (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: 'var(--border)', color: 'var(--text-muted)' }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</div>
        <div className="text-[10px] font-medium" style={{ color }}>{label}</div>
      </div>
    </div>
  )
}
