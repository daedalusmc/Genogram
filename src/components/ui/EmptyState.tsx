import { useState, useRef, useCallback } from 'react'
import { Gender, GENDER_LABELS } from '../../types/enums'
import { useGenogramStore } from '../../store/genogramStore'

const QUICK_GENDERS: Gender[] = [Gender.Female, Gender.Male, Gender.NonBinary, Gender.Unknown]

export function EmptyState() {
  const addPerson = useGenogramStore((s) => s.addPerson)
  const openPersonPanel = useGenogramStore((s) => s.openPersonPanel)
  const importJSON = useGenogramStore((s) => s.importJSON)
  const [showGenderPicker, setShowGenderPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAdd = useCallback((gender: Gender) => {
    const id = addPerson(gender)
    setShowGenderPicker(false)
    // Open the edit panel so the user can fill in name and details right away.
    setTimeout(() => openPersonPanel(id), 50)
  }, [addPerson, openPersonPanel])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') importJSON(reader.result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [importJSON])

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 5 }}
    >
      <div
        className="rounded-2xl p-8 max-w-md text-center pointer-events-auto"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          color: 'var(--text-primary)',
          animation: 'slideInUp 0.3s ease-out',
        }}
      >
        <div
          className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold tracking-tight mb-2">Start your genogram</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Add a person, then drag from any snap point to another person to create a relationship.
        </p>

        {!showGenderPicker ? (
          <div className="space-y-2">
            <button
              onClick={() => setShowGenderPicker(true)}
              className="w-full px-4 py-2.5 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              + Add your first person
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2.5 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              Import from JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider font-semibold mb-2"
              style={{ color: 'var(--text-muted)' }}>Choose a symbol</div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_GENDERS.map((g) => (
                <button
                  key={g}
                  onClick={() => handleAdd(g)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  {GENDER_LABELS[g]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGenderPicker(false)}
              className="text-xs mt-2 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
