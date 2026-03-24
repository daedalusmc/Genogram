import { useCallback, useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useGenogramStore } from '../../store/genogramStore'

export function PresentationMode() {
  const ui = useGenogramStore((s) => s.ui)
  const persons = useGenogramStore((s) => s.persons)
  const presentationOrder = useGenogramStore((s) => s.presentationOrder)
  const togglePresentationMode = useGenogramStore((s) => s.togglePresentationMode)
  const setPresentationIndex = useGenogramStore((s) => s.setPresentationIndex)
  const title = useGenogramStore((s) => s.title)
  const { fitView, setCenter } = useReactFlow()

  const order = presentationOrder.length > 0
    ? presentationOrder
    : Object.keys(persons)

  const currentPersonId = order[ui.presentationIndex]
  const currentPerson = currentPersonId ? persons[currentPersonId] : null

  const goNext = useCallback(() => {
    const nextIndex = Math.min(ui.presentationIndex + 1, order.length - 1)
    setPresentationIndex(nextIndex)
  }, [ui.presentationIndex, order.length, setPresentationIndex])

  const goPrev = useCallback(() => {
    const prevIndex = Math.max(ui.presentationIndex - 1, 0)
    setPresentationIndex(prevIndex)
  }, [ui.presentationIndex, setPresentationIndex])

  const showAll = useCallback(() => {
    fitView({ padding: 0.2, duration: 600 })
    setPresentationIndex(-1)
  }, [fitView, setPresentationIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'Escape') {
        togglePresentationMode()
      } else if (e.key === 'f') {
        showAll()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, togglePresentationMode, showAll])

  if (!ui.isPresentationMode) return null

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent z-50 p-4 pointer-events-none">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">{title}</h1>
          <div className="text-white/70 text-sm">
            {ui.presentationIndex >= 0
              ? `${ui.presentationIndex + 1} / ${order.length}`
              : 'Overview'
            }
          </div>
        </div>
      </div>

      {/* Person info card */}
      {currentPerson && ui.presentationIndex >= 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 p-5 min-w-[280px] max-w-[400px]">
          <div className="flex items-start gap-4">
            {currentPerson.photo && (
              <img
                src={currentPerson.photo}
                alt={currentPerson.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
              />
            )}
            <div>
              <h3 className="text-lg font-bold text-gray-800">{currentPerson.name || 'Unknown'}</h3>
              {currentPerson.dateOfBirth && (
                <p className="text-sm text-gray-500">Born: {currentPerson.dateOfBirth}</p>
              )}
              {currentPerson.isDeceased && currentPerson.dateOfDeath && (
                <p className="text-sm text-gray-500">Died: {currentPerson.dateOfDeath}</p>
              )}
              {currentPerson.labels.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {currentPerson.labels.map((l) => (
                    <span key={l} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{l}</span>
                  ))}
                </div>
              )}
              {currentPerson.notes && (
                <p className="text-sm text-gray-600 mt-2 italic">{currentPerson.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        <button
          onClick={goPrev}
          disabled={ui.presentationIndex <= 0}
          className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg text-gray-700 hover:bg-white disabled:opacity-30 transition-all"
        >
          &larr; Prev
        </button>
        <button
          onClick={showAll}
          className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg text-gray-700 hover:bg-white transition-all"
        >
          Show All
        </button>
        <button
          onClick={goNext}
          disabled={ui.presentationIndex >= order.length - 1}
          className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg text-gray-700 hover:bg-white disabled:opacity-30 transition-all"
        >
          Next &rarr;
        </button>
        <button
          onClick={togglePresentationMode}
          className="px-4 py-2 bg-red-500/90 backdrop-blur-sm rounded-lg shadow-lg text-white hover:bg-red-600 transition-all ml-4"
        >
          Exit
        </button>
      </div>
    </>
  )
}
