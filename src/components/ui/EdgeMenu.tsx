import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useReactFlow } from '@xyflow/react'

interface EdgeMenuProps {
  flowX: number
  flowY: number
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function EdgeMenu({ flowX, flowY, open, onClose, children }: EdgeMenuProps) {
  const { flowToScreenPosition } = useReactFlow()
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (open) {
      const screen = flowToScreenPosition({ x: flowX, y: flowY })
      setPos({ x: screen.x, y: screen.y })
    }
  }, [open, flowX, flowY, flowToScreenPosition])

  // Close on any click/pointer outside the menu
  useEffect(() => {
    if (!open) return

    const handler = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // Use capture phase to catch events before React Flow processes them
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handler, true)
      document.addEventListener('mousedown', handler, true)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', handler, true)
      document.removeEventListener('mousedown', handler, true)
    }
  }, [open, onClose])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      ref={menuRef}
      className="fixed rounded-lg py-1 text-sm z-[9999]"
      data-theme-menu
      style={{
        left: pos.x,
        top: pos.y + 8,
        maxHeight: 320,
        overflowY: 'auto',
        minWidth: 180,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
