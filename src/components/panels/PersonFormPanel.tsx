import { useCallback, useRef } from 'react'
import { useGenogramStore } from '../../store/genogramStore'
import { Gender, GENDER_LABELS, ConditionType, CONDITION_COLORS, STRUCTURAL_REL_LABELS, LABEL_COLORS, LABEL_NAMES } from '../../types/enums'
import type { Condition } from '../../types/person'

const inputClass = "w-full rounded-lg px-3 py-2 text-sm theme-input transition-colors"
const labelClass = "block text-xs font-semibold uppercase tracking-wider mb-1.5"

export function PersonFormPanel() {
  const ui = useGenogramStore((s) => s.ui)
  const persons = useGenogramStore((s) => s.persons)
  const structuralRels = useGenogramStore((s) => s.structuralRelationships)
  const updatePerson = useGenogramStore((s) => s.updatePerson)
  const removePerson = useGenogramStore((s) => s.removePerson)
  const closePanel = useGenogramStore((s) => s.closePanel)
  const startAddingRelationship = useGenogramStore((s) => s.startAddingRelationship)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const person = ui.selectedPersonId ? persons[ui.selectedPersonId] : null

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !person) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updatePerson(person.id, { photo: reader.result })
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [person, updatePerson])

  const toggleCondition = useCallback((type: ConditionType) => {
    if (!person) return
    const existing = person.conditions.find((c) => c.type === type)
    if (existing) {
      updatePerson(person.id, {
        conditions: person.conditions.filter((c) => c.type !== type),
      })
    } else {
      const condition: Condition = { type, inRecovery: false, suspected: false }
      updatePerson(person.id, {
        conditions: [...person.conditions, condition],
      })
    }
  }, [person, updatePerson])

  const addLabel = useCallback((label: string) => {
    if (!person || person.labels.includes(label)) return
    updatePerson(person.id, { labels: [...person.labels, label] })
  }, [person, updatePerson])

  const removeLabel = useCallback((label: string) => {
    if (!person) return
    updatePerson(person.id, { labels: person.labels.filter((l) => l !== label) })
  }, [person, updatePerson])

  if (!person || ui.panelMode !== 'person') return null

  return (
    <div className="w-80 h-full overflow-y-auto p-4 space-y-3"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        color: 'var(--text-primary)',
        animation: 'slideInRight 0.2s ease-out',
      }}>

      {/* Header */}
      <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold tracking-tight uppercase" style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}>Edit Person</h2>
        <button onClick={closePanel} className="w-6 h-6 flex items-center justify-center rounded-full text-sm leading-none transition-all"
          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--border)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}>&times;</button>
      </div>

      {/* Photo */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => photoInputRef.current?.click()}
          className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{ backgroundColor: 'var(--bg-hover)', border: '2px dashed var(--border)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1.03)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'scale(1)' }}
        >
          {person.photo ? (
            <img src={person.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Add Photo</span>
            </div>
          )}
        </button>
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        {person.photo && (
          <button
            onClick={() => updatePerson(person.id, { photo: null })}
            className="text-[10px] font-medium transition-colors"
            style={{ color: 'var(--danger)' }}
          >
            Remove Photo
          </button>
        )}
      </div>

      {/* Name */}
      <div>
        <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Name</label>
        <input
          type="text"
          value={person.name}
          onChange={(e) => updatePerson(person.id, { name: e.target.value })}
          className={inputClass}
          placeholder="Enter name"
        />
      </div>

      {/* Gender */}
      <div>
        <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Gender</label>
        <select
          value={person.gender}
          onChange={(e) => updatePerson(person.id, { gender: e.target.value as Gender })}
          className={inputClass}
        >
          {Object.entries(GENDER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Date of Birth */}
      <div>
        <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Date of Birth</label>
        <input
          type="date"
          value={person.dateOfBirth || ''}
          onChange={(e) => updatePerson(person.id, { dateOfBirth: e.target.value || null })}
          className={inputClass}
        />
      </div>

      {/* Deceased */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={person.isDeceased}
          onChange={(e) => updatePerson(person.id, { isDeceased: e.target.checked })}
          className="rounded"
          style={{ accentColor: 'var(--accent)' }}
        />
        <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Deceased</label>
      </div>

      {person.isDeceased && (
        <div>
          <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Date of Death</label>
          <input
            type="date"
            value={person.dateOfDeath || ''}
            onChange={(e) => updatePerson(person.id, { dateOfDeath: e.target.value || null })}
            className={inputClass}
          />
        </div>
      )}

      {/* Conditions */}
      <div>
        <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Health Conditions</label>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(ConditionType).map(([key, type]) => {
            const isActive = person.conditions.some((c) => c.type === type)
            return (
              <button
                key={key}
                onClick={() => toggleCondition(type)}
                className="text-xs px-2 py-1.5 rounded-lg text-left transition-all font-medium"
                style={isActive
                  ? { backgroundColor: CONDITION_COLORS[type], color: '#fff', border: '1px solid transparent' }
                  : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                }
              >
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Labels */}
      <div>
        <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Labels</label>
        {person.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {person.labels.map((label) => {
              const color = LABEL_COLORS[label] || 'var(--text-muted)'
              const name = LABEL_NAMES[label] || label
              return (
                <span
                  key={label}
                  className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1.5 font-medium"
                  style={{ backgroundColor: `${color}1f`, color, border: `1px solid ${color}66` }}
                  title={name}
                >
                  <span className="font-bold">{label}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                  <button onClick={() => removeLabel(label)} className="hover:opacity-70 ml-0.5">&times;</button>
                </span>
              )
            })}
          </div>
        )}
        <div className="space-y-1">
          {Object.keys(LABEL_COLORS).map((label) => {
            const color = LABEL_COLORS[label]
            const name = LABEL_NAMES[label]
            const active = person.labels.includes(label)
            return (
              <button
                key={label}
                onClick={() => addLabel(label)}
                disabled={active}
                className="w-full text-left px-2 py-1 text-xs rounded-md font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                  border: `1px solid ${active ? color : 'var(--border)'}`,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = color }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <span
                  className="inline-flex items-center justify-center w-7 px-1 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: color, color: '#fff' }}
                >
                  {label}
                </span>
                <span>{name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Notes</label>
        <textarea
          value={person.notes}
          onChange={(e) => updatePerson(person.id, { notes: e.target.value })}
          rows={3}
          className={`${inputClass} resize-none`}
          placeholder="Additional notes..."
        />
      </div>

      {/* Relationships */}
      <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <label className={`${labelClass} mb-2`} style={{ color: 'var(--text-secondary)' }}>Add Relationship</label>
        <div className="space-y-1.5">
          <button
            onClick={() => startAddingRelationship(person.id, 'structural')}
            className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <span className="font-medium">+ Partner / Spouse</span>
            <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>(click another person)</span>
          </button>
          <button
            onClick={() => startAddingRelationship(person.id, 'emotional')}
            className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <span className="font-medium">+ Emotional Relationship</span>
            <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>(click another person)</span>
          </button>

          {/* Add child: scope to a specific family unit so half-siblings land
              on the right T-junction. One button per structural rel the
              person is part of. */}
          {(() => {
            const myRels = Object.values(structuralRels).filter(
              (r) => r.person1Id === person.id || r.person2Id === person.id
            )
            if (myRels.length === 0) {
              return (
                <div className="px-3 py-2 text-xs rounded-lg" style={{
                  backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px dashed var(--border)',
                }}>
                  Add a partner first to add children.
                </div>
              )
            }
            return myRels.map((rel) => {
              const partnerId = rel.person1Id === person.id ? rel.person2Id : rel.person1Id
              const partner = persons[partnerId]
              const partnerName = partner?.name || 'Unknown'
              const relLabel = STRUCTURAL_REL_LABELS[rel.type] || rel.type
              return (
                <button
                  key={rel.id}
                  onClick={() => startAddingRelationship(person.id, 'child', rel.id)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span className="font-medium">+ Add Child with {partnerName}</span>
                  <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>({relLabel.toLowerCase()})</span>
                </button>
              )
            })
          })()}
        </div>
      </div>

      {/* Delete */}
      <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => { removePerson(person.id); closePanel() }}
          className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--danger-soft)', color: 'var(--danger)' }}
        >
          Delete Person
        </button>
      </div>
    </div>
  )
}
