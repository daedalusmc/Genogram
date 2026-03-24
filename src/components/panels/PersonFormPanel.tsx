import { useCallback, useRef } from 'react'
import { useGenogramStore } from '../../store/genogramStore'
import { Gender, GENDER_LABELS, ConditionType, CONDITION_COLORS, StructuralRelType, EmotionalRelType, ChildConnectionType } from '../../types/enums'
import type { Condition } from '../../types/person'

export function PersonFormPanel() {
  const ui = useGenogramStore((s) => s.ui)
  const persons = useGenogramStore((s) => s.persons)
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
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Edit Person</h2>
        <button onClick={closePanel} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>

      {/* Photo */}
      <div className="flex justify-center">
        <button
          onClick={() => photoInputRef.current?.click()}
          className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-blue-400 transition-colors"
        >
          {person.photo ? (
            <img src={person.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 text-xs text-center">Add Photo</span>
          )}
        </button>
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
      </div>
      {person.photo && (
        <button
          onClick={() => updatePerson(person.id, { photo: null })}
          className="text-xs text-red-500 hover:text-red-700 block mx-auto"
        >
          Remove Photo
        </button>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
        <input
          type="text"
          value={person.name}
          onChange={(e) => updatePerson(person.id, { name: e.target.value })}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Enter name"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Gender</label>
        <select
          value={person.gender}
          onChange={(e) => updatePerson(person.id, { gender: e.target.value as Gender })}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          {Object.entries(GENDER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Generation */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Generation (0 = oldest)</label>
        <input
          type="number"
          min={0}
          max={10}
          value={person.generation}
          onChange={(e) => updatePerson(person.id, { generation: parseInt(e.target.value) || 0 })}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Date of Birth */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Date of Birth</label>
        <input
          type="date"
          value={person.dateOfBirth || ''}
          onChange={(e) => updatePerson(person.id, { dateOfBirth: e.target.value || null })}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Deceased */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={person.isDeceased}
          onChange={(e) => updatePerson(person.id, { isDeceased: e.target.checked })}
          className="rounded"
        />
        <label className="text-sm text-gray-600">Deceased</label>
      </div>

      {person.isDeceased && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Date of Death</label>
          <input
            type="date"
            value={person.dateOfDeath || ''}
            onChange={(e) => updatePerson(person.id, { dateOfDeath: e.target.value || null })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}

      {/* Conditions */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Health Conditions</label>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(ConditionType).map(([key, type]) => {
            const isActive = person.conditions.some((c) => c.type === type)
            return (
              <button
                key={key}
                onClick={() => toggleCondition(type)}
                className={`text-xs px-2 py-1 rounded border text-left transition-colors ${
                  isActive
                    ? 'border-current text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={isActive ? { backgroundColor: CONDITION_COLORS[type] } : {}}
              >
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Labels */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Labels</label>
        <div className="flex flex-wrap gap-1 mb-2">
          {person.labels.map((label) => (
            <span key={label} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded flex items-center gap-1">
              {label}
              <button onClick={() => removeLabel(label)} className="hover:text-red-900">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {['LD', 'PD', 'SD', 'MH', 'AM', 'SM', 'D', 'P', 'CAR', 'SI', 'LI', 'SA', 'PA', 'A', 'EA'].map((label) => (
            <button
              key={label}
              onClick={() => addLabel(label)}
              disabled={person.labels.includes(label)}
              className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-30"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
        <textarea
          value={person.notes}
          onChange={(e) => updatePerson(person.id, { notes: e.target.value })}
          rows={3}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none resize-none"
          placeholder="Additional notes..."
        />
      </div>

      {/* Relationships */}
      <div className="border-t border-gray-200 pt-3">
        <label className="block text-sm font-medium text-gray-600 mb-2">Add Relationship</label>
        <div className="space-y-1">
          <button
            onClick={() => startAddingRelationship(person.id, 'structural')}
            className="w-full text-left px-3 py-1.5 text-sm bg-gray-50 rounded hover:bg-gray-100 text-gray-700"
          >
            + Partner / Spouse (click another person)
          </button>
          <button
            onClick={() => startAddingRelationship(person.id, 'emotional')}
            className="w-full text-left px-3 py-1.5 text-sm bg-gray-50 rounded hover:bg-gray-100 text-gray-700"
          >
            + Emotional Relationship (click another person)
          </button>
          <button
            onClick={() => startAddingRelationship(person.id, 'child')}
            className="w-full text-left px-3 py-1.5 text-sm bg-gray-50 rounded hover:bg-gray-100 text-gray-700"
          >
            + Add Child (click a child person)
          </button>
        </div>
      </div>

      {/* Delete */}
      <div className="border-t border-gray-200 pt-3">
        <button
          onClick={() => {
            removePerson(person.id)
            closePanel()
          }}
          className="w-full px-3 py-1.5 bg-red-50 text-red-600 rounded text-sm hover:bg-red-100 transition-colors"
        >
          Delete Person
        </button>
      </div>
    </div>
  )
}
