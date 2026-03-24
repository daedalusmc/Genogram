import { useCallback, useRef, useState } from 'react'
import { Gender } from '../../types/enums'
import { useGenogramStore } from '../../store/genogramStore'
import { useReactFlow } from '@xyflow/react'

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

function AddPersonDropdown({ onAdd }: { onAdd: (g: Gender, gen: number) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        + Add Person
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[180px]">
            {GENDER_OPTIONS.map(({ gender, label }) => (
              <button
                key={gender}
                onClick={() => { onAdd(gender, 0); setOpen(false); }}
                className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
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

export function Toolbar() {
  const addPerson = useGenogramStore((s) => s.addPerson)
  const title = useGenogramStore((s) => s.title)
  const setTitle = useGenogramStore((s) => s.setTitle)
  const ui = useGenogramStore((s) => s.ui)
  const togglePresentationMode = useGenogramStore((s) => s.togglePresentationMode)
  const toggleLegend = useGenogramStore((s) => s.toggleLegend)
  const triggerAutoLayout = useGenogramStore((s) => s.triggerAutoLayout)
  const setNodePositions = useGenogramStore((s) => s.setNodePositions)
  const exportJSON = useGenogramStore((s) => s.exportJSON)
  const importJSON = useGenogramStore((s) => s.importJSON)
  const { fitView } = useReactFlow()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddPerson = useCallback((gender: Gender, generation: number) => {
    addPerson(gender, generation)
    // Auto fit view after adding so new person is visible
    setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 50)
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
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-wrap">
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-lg font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 min-w-[200px]"
      />

      <div className="h-6 w-px bg-gray-300" />

      {/* Add Person dropdown */}
      <AddPersonDropdown onAdd={handleAddPerson} />

      {/* Auto Layout - recalculates all positions */}
      <button
        onClick={() => {
          setNodePositions({}) // Clear all manual positions
          triggerAutoLayout()  // Trigger recalculation
          setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 100)
        }}
        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
      >
        Auto Layout
      </button>

      {/* Fit View */}
      <button
        onClick={() => fitView({ padding: 0.2, duration: 400 })}
        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
      >
        Fit View
      </button>

      {/* Legend */}
      <button
        onClick={toggleLegend}
        className={`px-3 py-1.5 rounded text-sm transition-colors ${
          ui.showLegend ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Legend
      </button>

      <div className="flex-1" />

      {/* Import/Export */}
      <button
        onClick={handleImport}
        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
      >
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={handleExport}
        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
      >
        Export
      </button>

      {/* Presentation Mode */}
      <button
        onClick={togglePresentationMode}
        className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        Present
      </button>
    </div>
  )
}
