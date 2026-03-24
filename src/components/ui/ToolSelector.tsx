import { useGenogramStore } from '../../store/genogramStore'

export type ToolMode = 'hand' | 'pointer' | 'move'

export function ToolSelector() {
  const toolMode = useGenogramStore((s) => s.ui.toolMode)
  const setToolMode = useGenogramStore((s) => s.setToolMode)
  const isPresentationMode = useGenogramStore((s) => s.ui.isPresentationMode)

  if (isPresentationMode) return null

  return (
    <div className="absolute bottom-4 left-16 z-40 flex bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setToolMode('hand')}
        className={`px-3 py-2 text-sm flex flex-col items-center gap-0.5 transition-colors ${
          toolMode === 'hand' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
        }`}
        title="Pan canvas (drag to scroll)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10V5a2 2 0 0 0-4 0v9l-1.8-2.4a2 2 0 0 0-3.2 2.4L7 22h10l3-8v-3a2 2 0 0 0-4 0v1" />
        </svg>
        <span className="text-[9px]">Pan</span>
      </button>
      <button
        onClick={() => setToolMode('pointer')}
        className={`px-3 py-2 text-sm flex flex-col items-center gap-0.5 transition-colors ${
          toolMode === 'pointer' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
        }`}
        title="Select and edit entities or relationships"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13l6 6" />
        </svg>
        <span className="text-[9px]">Select</span>
      </button>
      <button
        onClick={() => setToolMode('move')}
        className={`px-3 py-2 text-sm flex flex-col items-center gap-0.5 transition-colors ${
          toolMode === 'move' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
        }`}
        title="Move entities and relationship lines"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3" />
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
        <span className="text-[9px]">Move</span>
      </button>
    </div>
  )
}
