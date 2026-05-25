import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useGenogramStore } from '../../store/genogramStore'

export function HelpPanel() {
  const showHelp = useGenogramStore((s) => s.ui.showHelp)
  const toggleHelp = useGenogramStore((s) => s.toggleHelp)

  useEffect(() => {
    if (!showHelp) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleHelp()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showHelp, toggleHelp])

  if (!showHelp) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={toggleHelp}
    >
      <div
        className="rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h2 className="text-lg font-bold tracking-tight">How to use Genogram</h2>
          <button
            onClick={toggleHelp}
            className="w-8 h-8 flex items-center justify-center rounded-full text-base transition-colors"
            style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)' }}
            aria-label="Close help"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          <Section title="Quick start">
            <ol className="space-y-2.5">
              <Step n="1" title="Add people">
                Use the <strong>+ Add Person</strong> button up top and pick a symbol
                (Male, Female, Non-Binary, Unknown, Pet, etc.). The camera centers on
                each new person automatically.
              </Step>
              <Step n="2" title="Drag to connect">
                Hover any person to reveal eight <strong>snap points</strong> on their
                outline. Drag from a snap point on one person to a snap point on another
                to create a relationship line.
              </Step>
              <Step n="3" title="Add children">
                Click a parent to open their edit panel. Under <em>Add Relationship</em>,
                use <strong>+ Add Child with [partner]</strong> to pick which family the
                child belongs to, then click the child on the canvas. This is how
                half-siblings end up on the correct T-junction.
              </Step>
            </ol>
          </Section>

          <Section title="Edit a relationship line">
            <p>
              Click any line on the canvas to open the relationship editor. From the box
              that pops up you can:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-2">
              <li>Change the relationship <strong>type</strong> — pick from any
              Familial or Emotional option in one scrollable list.</li>
              <li>Adjust the <strong>connection points</strong> — click any of the
              eight dots on the source or target shape to re-route which side the
              line attaches to.</li>
              <li><strong>Delete</strong> the relationship.</li>
            </ul>
            <p className="mt-2">
              You can also drag any point along a line to add a bend, and right-click a
              waypoint to remove it.
            </p>
          </Section>

          <Section title="Auto Layout (Beta)">
            <p>
              Click <strong>Auto Layout</strong> to arrange everyone into a clean
              hierarchical tree by generation. After a layout runs, an{' '}
              <strong>↶ Undo Layout</strong> chip appears next to the button — click it
              to restore your previous positions. Dragging any node clears the undo
              chip (so it doesn't linger forever).
            </p>
          </Section>

          <Section title="Conditions and labels">
            <p>
              <strong>Health Conditions</strong> render as colored bands across the
              person's shape. <strong>Labels</strong> render as colored pills above
              their name. Both toggle on/off in the edit panel — click a button to
              apply, click again to remove. The <strong>Legend</strong> button in the
              toolbar shows what every color and code means.
            </p>
          </Section>

          <Section title="Presentation mode">
            <p>
              Click <strong>Present</strong> (top right) to enter a guided walkthrough.
              Use the arrow keys to step through people one at a time — the camera
              centers on each, and a detail panel slides in showing their info,
              conditions, and relationships. Hit Escape or click Present again to exit.
            </p>
          </Section>

          <Section title="Save your work">
            <p>
              Genograms auto-save to this browser. To move work between machines, share
              it, or guarantee you won't lose it, use{' '}
              <strong>Export</strong> (top right) to download a JSON file, and{' '}
              <strong>Import</strong> to load one back in.
            </p>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Tip: export before any big restructuring — it's a one-click safety net.
            </p>
          </Section>

          <Section title="Beta notice">
            <p>
              This is a work in progress. If something behaves unexpectedly, exporting
              your data and reloading the page is the safest reset. Please be gentle.
            </p>
          </Section>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-2"
        style={{ color: 'var(--text-muted)' }}>
        {title}
      </h3>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </section>
  )
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
        style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
      >
        {n}
      </span>
      <div>
        <div className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{title}</div>
        <div>{children}</div>
      </div>
    </li>
  )
}
