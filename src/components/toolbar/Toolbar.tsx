import { useCallback, useRef, useState } from 'react'
import { Gender } from '../../types/enums'
import { useGenogramStore } from '../../store/genogramStore'
import { useReactFlow } from '@xyflow/react'

function ClearButton() {
  const [confirming, setConfirming] = useState(false)
  const resetData = useGenogramStore((s) => s.resetData)
  const personCount = useGenogramStore((s) => Object.keys(s.persons).length)

  if (personCount === 0) return null

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
        title="Clear the canvas and start fresh"
      >
        Clear
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-full"
      style={{ backgroundColor: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
      <span className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
        Clear everything?
      </span>
      <button
        onClick={() => { resetData(); setConfirming(false) }}
        className="px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
      >
        Yes
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        Cancel
      </button>
    </div>
  )
}

const GENDER_OPTIONS = [
  { gender: Gender.Male, label: 'Male' },
  { gender: Gender.Female, label: 'Female' },
  { gender: Gender.Unknown, label: 'Unknown Gender' },
  { gender: Gender.NonBinary, label: 'Non-Binary' },
  { gender: Gender.TransFtoM, label: 'Transgender (F\u2192M)' },
  { gender: Gender.TransMtoF, label: 'Transgender (M\u2192F)' },
  { gender: Gender.GayMale, label: 'Gay Male' },
  { gender: Gender.Lesbian, label: 'Lesbian' },
  { gender: Gender.Pet, label: 'Pet' },
]

// Reusable pill button
function PillBtn({ children, onClick, active, style: extraStyle, ...rest }: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  style?: React.CSSProperties
  [k: string]: unknown
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
      style={{
        backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-hover)',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
        ...extraStyle,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

function AddPersonDropdown({ onAdd }: { onAdd: (g: Gender) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        + Add Person
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 rounded-xl py-1.5 z-50 min-w-[190px] backdrop-blur-xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            {GENDER_OPTIONS.map(({ gender, label }) => (
              <button
                key={gender}
                onClick={() => { onAdd(gender); setOpen(false) }}
                className="block w-full text-left px-4 py-2 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ThemeToggle() {
  const isDark = useGenogramStore((s) => s.ui.isDarkMode)
  const toggleTheme = useGenogramStore((s) => s.toggleTheme)

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full transition-all duration-150"
      style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

// Divider between groups
function Sep() {
  return <div className="h-4 w-px mx-0.5" style={{ backgroundColor: 'var(--border)' }} />
}

export function Toolbar() {
  const addPerson = useGenogramStore((s) => s.addPerson)
  const title = useGenogramStore((s) => s.title)
  const setTitle = useGenogramStore((s) => s.setTitle)
  const ui = useGenogramStore((s) => s.ui)
  const togglePresentationMode = useGenogramStore((s) => s.togglePresentationMode)
  const toggleLegend = useGenogramStore((s) => s.toggleLegend)
  const triggerAutoLayout = useGenogramStore((s) => s.triggerAutoLayout)
  const setNodePositions = useGenogramStore((s) => s.setNodePositions)
  const captureLayoutSnapshot = useGenogramStore((s) => s.captureLayoutSnapshot)
  const undoLayout = useGenogramStore((s) => s.undoLayout)
  const layoutSnapshot = useGenogramStore((s) => s.layoutSnapshot)
  const toggleHelp = useGenogramStore((s) => s.toggleHelp)
  const exportJSON = useGenogramStore((s) => s.exportJSON)
  const importJSON = useGenogramStore((s) => s.importJSON)
  const { fitView } = useReactFlow()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddPerson = useCallback((gender: Gender) => {
    const id = addPerson(gender)
    // Focus the camera on just the new person (with generous padding so a
    // few neighbors stay visible for context). Without this, large families
    // make new additions easy to miss.
    setTimeout(() => fitView({ nodes: [{ id }], padding: 2, duration: 400 }), 50)
  }, [addPerson, fitView])

  const handleExport = useCallback(() => {
    const json = exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `genogram-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [exportJSON])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        importJSON(reader.result)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [importJSON])

  if (ui.isPresentationMode) return null

  return (
    <div className="px-4 py-2 flex items-center gap-2 flex-wrap backdrop-blur-xl relative z-50"
      style={{
        backgroundColor: ui.isDarkMode ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-base font-bold tracking-tight bg-transparent border-b-2 border-transparent focus:outline-none px-1 min-w-[160px] transition-colors"
        style={{ color: 'var(--text-primary)' }}
        onFocus={(e) => e.currentTarget.style.borderBottomColor = 'var(--accent)'}
        onBlur={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
      />

      <Sep />

      {/* Add Person */}
      <AddPersonDropdown onAdd={handleAddPerson} />

      <Sep />

      {/* Layout group */}
      <div className="flex items-center gap-1 rounded-full p-0.5"
        style={{ backgroundColor: 'var(--bg-hover)' }}>
        <button
          onClick={() => {
            captureLayoutSnapshot()
            setNodePositions({})
            triggerAutoLayout()
            setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 100)
          }}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 flex items-center gap-1.5"
          style={{ backgroundColor: 'transparent', color: 'var(--text-secondary)' }}
        >
          Auto Layout
          <span
            className="px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            Beta
          </span>
        </button>
        {layoutSnapshot && (
          <button
            onClick={undoLayout}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 flex items-center gap-1"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
            title="Restore positions from before the last Auto Layout"
          >
            ↶ Undo Layout
          </button>
        )}
        <PillBtn onClick={() => fitView({ padding: 0.2, duration: 400 })}
          style={{ backgroundColor: 'transparent' }}>
          Fit View
        </PillBtn>
        <PillBtn onClick={toggleLegend} active={ui.showLegend}
          style={ui.showLegend ? {} : { backgroundColor: 'transparent' }}>
          Legend
        </PillBtn>
        <PillBtn onClick={toggleHelp} style={{ backgroundColor: 'transparent' }}>
          Help
        </PillBtn>
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <ThemeToggle />

      <Sep />

      <div className="flex items-center gap-1">
        <PillBtn onClick={handleImport}>Import</PillBtn>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        <PillBtn onClick={handleExport}>Export</PillBtn>
        <ClearButton />
      </div>

      <Sep />

      {/* Present button */}
      <button
        onClick={togglePresentationMode}
        className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
        style={{
          background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
        }}
      >
        Present
      </button>
    </div>
  )
}
