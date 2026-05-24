import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Person } from '../types/person'
import type { StructuralRelationship, EmotionalRelationship, ChildConnection } from '../types/relationship'
import { Gender, StructuralRelType, EmotionalRelType, ChildConnectionType } from '../types/enums'

interface UIState {
  selectedPersonId: string | null
  selectedRelationshipId: string | null
  isPanelOpen: boolean
  panelMode: 'person' | 'structural' | 'emotional' | null
  isAddingRelationship: boolean
  relationshipSourceId: string | null
  addRelationshipType: 'structural' | 'emotional' | 'child' | null
  // When adding a child, the specific structural rel the child should join.
  // null means "no preference" (fallback to first rel involving the source).
  addChildToRelId: string | null
  isPresentationMode: boolean
  presentationIndex: number
  showLegend: boolean
  toolMode: 'hand' | 'pointer' | 'move'
  editingEdgeId: string | null
  isDarkMode: boolean
}

interface GenogramStore {
  // Data
  title: string
  persons: Record<string, Person>
  structuralRelationships: Record<string, StructuralRelationship>
  emotionalRelationships: Record<string, EmotionalRelationship>
  presentationOrder: string[]
  nodePositions: Record<string, { x: number; y: number }>
  // Edge waypoint overrides: keyed by edge id, stores user-adjusted waypoints
  edgeWaypoints: Record<string, { dropX?: number; barY?: number }>
  layoutVersion: number // incremented to trigger re-layout

  // UI
  ui: UIState

  // Actions - Persons
  addPerson: (gender: Gender, generation?: number) => string
  updatePerson: (id: string, updates: Partial<Person>) => void
  removePerson: (id: string) => void

  // Actions - Structural Relationships
  addStructuralRelationship: (person1Id: string, person2Id: string, type: StructuralRelType) => string
  updateStructuralRelationship: (id: string, updates: Partial<StructuralRelationship>) => void
  removeStructuralRelationship: (id: string) => void
  addChildToRelationship: (relId: string, childId: string, connectionType: ChildConnectionType) => void
  removeChildFromRelationship: (relId: string, childId: string) => void

  // Actions - Emotional Relationships
  addEmotionalRelationship: (person1Id: string, person2Id: string, type: EmotionalRelType) => string
  updateEmotionalRelationship: (id: string, updates: Partial<EmotionalRelationship>) => void
  removeEmotionalRelationship: (id: string) => void

  // Actions - UI
  selectPerson: (id: string | null) => void
  openPersonPanel: (id: string) => void
  openStructuralPanel: (id: string) => void
  openEmotionalPanel: (id: string) => void
  closePanel: () => void
  startAddingRelationship: (sourceId: string, type: 'structural' | 'emotional' | 'child', toRelId?: string) => void
  cancelAddingRelationship: () => void
  togglePresentationMode: () => void
  setPresentationIndex: (index: number) => void
  toggleLegend: () => void
  setToolMode: (mode: 'hand' | 'pointer' | 'move') => void
  setEditingEdgeId: (id: string | null) => void
  toggleTheme: () => void
  setTitle: (title: string) => void

  // Actions - Positions
  setNodePosition: (id: string, pos: { x: number; y: number }) => void
  setNodePositions: (positions: Record<string, { x: number; y: number }>) => void
  setEdgeWaypoint: (edgeId: string, waypoint: { dropX?: number; barY?: number }) => void
  updateEdgeRoute: (relType: 'structural' | 'emotional', relId: string, route: Partial<import('../types/relationship').EdgeRoute>) => void
  batchUpdateEdgeRoutes: (updates: Array<{ relType: 'structural' | 'emotional'; relId: string; route: Partial<import('../types/relationship').EdgeRoute> }>) => void
  convertToEmotional: (structRelId: string, emotionalType: import('../types/enums').EmotionalRelType) => string | null
  convertToStructural: (emoRelId: string, structuralType: import('../types/enums').StructuralRelType) => string | null
  triggerAutoLayout: () => void

  // Actions - Presentation
  setPresentationOrder: (order: string[]) => void

  // Actions - Persistence
  exportJSON: () => string
  importJSON: (json: string) => void
  saveToLocalStorage: () => void
  loadFromLocalStorage: () => boolean
}

const DEFAULT_UI: UIState = {
  selectedPersonId: null,
  selectedRelationshipId: null,
  isPanelOpen: false,
  panelMode: null,
  isAddingRelationship: false,
  relationshipSourceId: null,
  addRelationshipType: null,
  addChildToRelId: null,
  isPresentationMode: false,
  presentationIndex: 0,
  showLegend: false,
  toolMode: 'pointer' as const,
  editingEdgeId: null,
  isDarkMode: localStorage.getItem('genogram-theme') === 'dark',
}

function createDefaultPerson(gender: Gender, generation: number): Person {
  return {
    id: uuidv4(),
    name: '',
    dateOfBirth: null,
    dateOfDeath: null,
    gender,
    photo: null,
    conditions: [],
    labels: [],
    notes: '',
    isDeceased: false,
    pregnancyType: null,
    generation,
    parentRelationshipId: null,
    parentIds: null,
  }
}

// Compute generation levels from the parent-child tree via BFS
function computeGenerations(
  persons: Record<string, Person>,
  structuralRels: Record<string, StructuralRelationship>,
): Record<string, number> {
  // Build child→parentRelId map
  const childToRel: Record<string, string> = {}
  for (const rel of Object.values(structuralRels)) {
    for (const child of rel.children) {
      childToRel[child.childId] = rel.id
    }
  }

  // Find roots: persons who are not children of any relationship
  const allIds = Object.keys(persons)
  const childIds = new Set(Object.keys(childToRel))
  const roots = allIds.filter((id) => !childIds.has(id))

  const generations: Record<string, number> = {}

  // BFS from roots
  const queue: Array<{ id: string; gen: number }> = roots.map((id) => ({ id, gen: 0 }))
  const visited = new Set<string>()

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    generations[id] = gen

    // If this person is a partner in any structural relationship, ensure partner has same generation
    for (const rel of Object.values(structuralRels)) {
      if (rel.person1Id === id && !visited.has(rel.person2Id)) {
        queue.push({ id: rel.person2Id, gen })
      } else if (rel.person2Id === id && !visited.has(rel.person1Id)) {
        queue.push({ id: rel.person1Id, gen })
      }

      // Process children of relationships this person is part of
      if (rel.person1Id === id || rel.person2Id === id) {
        for (const child of rel.children) {
          if (!visited.has(child.childId)) {
            queue.push({ id: child.childId, gen: gen + 1 })
          }
        }
      }
    }
  }

  // Any unvisited persons default to generation 0
  for (const id of allIds) {
    if (!(id in generations)) generations[id] = 0
  }

  return generations
}

// Sync parentRelationshipId, parentIds, and generation on all persons
function syncPersonParentRefs(
  persons: Record<string, Person>,
  structuralRels: Record<string, StructuralRelationship>,
): Record<string, Person> {
  const updated = { ...persons }

  // Clear all parent refs
  for (const id of Object.keys(updated)) {
    updated[id] = { ...updated[id], parentRelationshipId: null, parentIds: null }
  }

  // Set parent refs from structural relationship children
  for (const rel of Object.values(structuralRels)) {
    for (const child of rel.children) {
      if (updated[child.childId]) {
        updated[child.childId] = {
          ...updated[child.childId],
          parentRelationshipId: rel.id,
          parentIds: [rel.person1Id, rel.person2Id],
        }
      }
    }
  }

  // Compute generations and apply
  const generations = computeGenerations(updated, structuralRels)
  for (const [id, gen] of Object.entries(generations)) {
    if (updated[id]) {
      updated[id] = { ...updated[id], generation: gen }
    }
  }

  return updated
}

export const useGenogramStore = create<GenogramStore>((set, get) => ({
  title: 'My Family Genogram',
  persons: {},
  structuralRelationships: {},
  emotionalRelationships: {},
  presentationOrder: [],
  nodePositions: {},
  edgeWaypoints: {},
  layoutVersion: 0,
  ui: { ...DEFAULT_UI },

  addPerson: (gender, generation = 0) => {
    const person = createDefaultPerson(gender, generation)
    // Place new person near existing nodes or at a default position
    const state = get()
    const existingPositions = Object.values(state.nodePositions)
    let x = 200
    let y = 100
    if (existingPositions.length > 0) {
      // Place to the right of the rightmost existing node
      const maxX = Math.max(...existingPositions.map((p) => p.x))
      const avgY = existingPositions.reduce((sum, p) => sum + p.y, 0) / existingPositions.length
      x = maxX + 200
      y = avgY
    }
    set((state) => ({
      persons: { ...state.persons, [person.id]: person },
      nodePositions: { ...state.nodePositions, [person.id]: { x, y } },
    }))
    get().saveToLocalStorage()
    return person.id
  },

  updatePerson: (id, updates) => {
    set((state) => ({
      persons: {
        ...state.persons,
        [id]: { ...state.persons[id], ...updates },
      },
    }))
    get().saveToLocalStorage()
  },

  removePerson: (id) => {
    set((state) => {
      const newPersons = { ...state.persons }
      delete newPersons[id]

      // Remove any structural relationships involving this person
      const newStructural = { ...state.structuralRelationships }
      for (const [relId, rel] of Object.entries(newStructural)) {
        if (rel.person1Id === id || rel.person2Id === id) {
          delete newStructural[relId]
        } else {
          // Remove as child
          newStructural[relId] = {
            ...rel,
            children: rel.children.filter((c) => c.childId !== id),
          }
        }
      }

      // Remove emotional relationships
      const newEmotional = { ...state.emotionalRelationships }
      for (const [relId, rel] of Object.entries(newEmotional)) {
        if (rel.person1Id === id || rel.person2Id === id) {
          delete newEmotional[relId]
        }
      }

      return {
        persons: syncPersonParentRefs(newPersons, newStructural),
        structuralRelationships: newStructural,
        emotionalRelationships: newEmotional,
        presentationOrder: state.presentationOrder.filter((pid) => pid !== id),
        ui: state.ui.selectedPersonId === id ? { ...state.ui, selectedPersonId: null, isPanelOpen: false, panelMode: null } : state.ui,
      }
    })
    get().saveToLocalStorage()
  },

  addStructuralRelationship: (person1Id, person2Id, type) => {
    // Dedupe: only one structural rel per pair (order-insensitive).
    // If one exists, update its type instead of creating a duplicate.
    const existing = Object.values(get().structuralRelationships).find(
      (r) => (r.person1Id === person1Id && r.person2Id === person2Id) ||
             (r.person1Id === person2Id && r.person2Id === person1Id)
    )
    if (existing) {
      if (existing.type !== type) {
        set((state) => ({
          structuralRelationships: {
            ...state.structuralRelationships,
            [existing.id]: { ...existing, type },
          },
        }))
      }
      return existing.id
    }

    const id = uuidv4()
    const rel: StructuralRelationship = {
      id,
      type,
      person1Id,
      person2Id,
      startDate: null,
      endDate: null,
      children: [],
      route: { sourceHandle: 'right-center', targetHandle: 'left-center', waypoints: [] },
    }
    set((state) => ({
      structuralRelationships: { ...state.structuralRelationships, [id]: rel },
    }))
    get().saveToLocalStorage()
    return id
  },

  updateStructuralRelationship: (id, updates) => {
    set((state) => ({
      structuralRelationships: {
        ...state.structuralRelationships,
        [id]: { ...state.structuralRelationships[id], ...updates },
      },
    }))
    get().saveToLocalStorage()
  },

  removeStructuralRelationship: (id) => {
    set((state) => {
      const newRels = { ...state.structuralRelationships }
      delete newRels[id]
      return {
        structuralRelationships: newRels,
        persons: syncPersonParentRefs(state.persons, newRels),
      }
    })
    get().saveToLocalStorage()
  },

  addChildToRelationship: (relId, childId, connectionType) => {
    set((state) => {
      const rel = state.structuralRelationships[relId]
      if (!rel) return state
      const child: ChildConnection = { childId, type: connectionType, attachmentT: 0.5 }
      const newStructural = {
        ...state.structuralRelationships,
        [relId]: { ...rel, children: [...rel.children, child] },
      }
      return {
        structuralRelationships: newStructural,
        persons: syncPersonParentRefs(state.persons, newStructural),
      }
    })
    get().saveToLocalStorage()
  },

  removeChildFromRelationship: (relId, childId) => {
    set((state) => {
      const rel = state.structuralRelationships[relId]
      if (!rel) return state
      const newStructural = {
        ...state.structuralRelationships,
        [relId]: { ...rel, children: rel.children.filter((c) => c.childId !== childId) },
      }
      return {
        structuralRelationships: newStructural,
        persons: syncPersonParentRefs(state.persons, newStructural),
      }
    })
    get().saveToLocalStorage()
  },

  addEmotionalRelationship: (person1Id, person2Id, type) => {
    // Dedupe: same (pair, type) → return existing. Different types between the
    // same pair are allowed (e.g. Close + Conflict).
    const existing = Object.values(get().emotionalRelationships).find(
      (r) => r.type === type && (
        (r.person1Id === person1Id && r.person2Id === person2Id) ||
        (r.person1Id === person2Id && r.person2Id === person1Id)
      )
    )
    if (existing) return existing.id

    const id = uuidv4()
    const isDirected = [
      EmotionalRelType.Violence, EmotionalRelType.PhysicalAbuse,
      EmotionalRelType.EmotionalAbuse, EmotionalRelType.SexualAbuse,
      EmotionalRelType.Neglect, EmotionalRelType.FocusedOn,
      EmotionalRelType.FocusedOnNegatively, EmotionalRelType.Manipulative,
      EmotionalRelType.Controlling,
    ].includes(type)

    const rel: EmotionalRelationship = {
      id, type, person1Id, person2Id, isDirected, notes: '',
      route: { sourceHandle: 'top-center', targetHandle: 'bottom-center', waypoints: [] },
    }
    set((state) => ({
      emotionalRelationships: { ...state.emotionalRelationships, [id]: rel },
    }))
    get().saveToLocalStorage()
    return id
  },

  updateEmotionalRelationship: (id, updates) => {
    set((state) => ({
      emotionalRelationships: {
        ...state.emotionalRelationships,
        [id]: { ...state.emotionalRelationships[id], ...updates },
      },
    }))
    get().saveToLocalStorage()
  },

  removeEmotionalRelationship: (id) => {
    set((state) => {
      const newRels = { ...state.emotionalRelationships }
      delete newRels[id]
      return { emotionalRelationships: newRels }
    })
    get().saveToLocalStorage()
  },

  selectPerson: (id) => {
    set((state) => ({ ui: { ...state.ui, selectedPersonId: id } }))
  },

  openPersonPanel: (id) => {
    set((state) => ({
      ui: { ...state.ui, selectedPersonId: id, isPanelOpen: true, panelMode: 'person', selectedRelationshipId: null },
    }))
  },

  openStructuralPanel: (id) => {
    set((state) => ({
      ui: { ...state.ui, selectedRelationshipId: id, isPanelOpen: true, panelMode: 'structural', selectedPersonId: null },
    }))
  },

  openEmotionalPanel: (id) => {
    set((state) => ({
      ui: { ...state.ui, selectedRelationshipId: id, isPanelOpen: true, panelMode: 'emotional', selectedPersonId: null },
    }))
  },

  closePanel: () => {
    set((state) => ({
      ui: { ...state.ui, isPanelOpen: false, panelMode: null, selectedPersonId: null, selectedRelationshipId: null },
    }))
  },

  startAddingRelationship: (sourceId, type, toRelId) => {
    set((state) => ({
      ui: {
        ...state.ui,
        isAddingRelationship: true,
        relationshipSourceId: sourceId,
        addRelationshipType: type,
        addChildToRelId: toRelId ?? null,
      },
    }))
  },

  cancelAddingRelationship: () => {
    set((state) => ({
      ui: {
        ...state.ui,
        isAddingRelationship: false,
        relationshipSourceId: null,
        addRelationshipType: null,
        addChildToRelId: null,
      },
    }))
  },

  togglePresentationMode: () => {
    set((state) => ({
      ui: { ...state.ui, isPresentationMode: !state.ui.isPresentationMode, presentationIndex: 0, isPanelOpen: false },
    }))
  },

  setPresentationIndex: (index) => {
    set((state) => ({ ui: { ...state.ui, presentationIndex: index } }))
  },

  toggleLegend: () => {
    set((state) => ({ ui: { ...state.ui, showLegend: !state.ui.showLegend } }))
  },

  setToolMode: (mode) => {
    set((state) => ({ ui: { ...state.ui, toolMode: mode } }))
  },

  setEditingEdgeId: (id) => {
    set((state) => ({ ui: { ...state.ui, editingEdgeId: id } }))
  },

  toggleTheme: () => {
    set((state) => {
      const newDark = !state.ui.isDarkMode
      localStorage.setItem('genogram-theme', newDark ? 'dark' : 'light')
      return { ui: { ...state.ui, isDarkMode: newDark } }
    })
  },

  setTitle: (title) => set({ title }),

  setPresentationOrder: (order) => set({ presentationOrder: order }),

  setNodePosition: (id, pos) => {
    set((state) => ({
      nodePositions: { ...state.nodePositions, [id]: pos },
    }))
    // Save without triggering re-layout
    get().saveToLocalStorage()
  },

  setNodePositions: (positions) => {
    set({ nodePositions: positions })
    get().saveToLocalStorage()
  },

  setEdgeWaypoint: (edgeId, waypoint) => {
    set((state) => ({
      edgeWaypoints: {
        ...state.edgeWaypoints,
        [edgeId]: { ...state.edgeWaypoints[edgeId], ...waypoint },
      },
    }))
    get().saveToLocalStorage()
  },

  updateEdgeRoute: (relType, relId, routeUpdate) => {
    set((state) => {
      if (relType === 'structural') {
        const rel = state.structuralRelationships[relId]
        if (!rel) return state
        return {
          structuralRelationships: {
            ...state.structuralRelationships,
            [relId]: { ...rel, route: { ...rel.route, ...routeUpdate } },
          },
        }
      } else {
        const rel = state.emotionalRelationships[relId]
        if (!rel) return state
        return {
          emotionalRelationships: {
            ...state.emotionalRelationships,
            [relId]: { ...rel, route: { ...rel.route, ...routeUpdate } },
          },
        }
      }
    })
    get().saveToLocalStorage()
  },

  batchUpdateEdgeRoutes: (updates) => {
    set((state) => {
      const newStructural = { ...state.structuralRelationships }
      const newEmotional = { ...state.emotionalRelationships }

      for (const { relType, relId, route } of updates) {
        if (relType === 'structural' && newStructural[relId]) {
          newStructural[relId] = {
            ...newStructural[relId],
            route: { ...newStructural[relId].route, ...route },
          }
        } else if (relType === 'emotional' && newEmotional[relId]) {
          newEmotional[relId] = {
            ...newEmotional[relId],
            route: { ...newEmotional[relId].route, ...route },
          }
        }
      }

      return {
        structuralRelationships: newStructural,
        emotionalRelationships: newEmotional,
      }
    })
    get().saveToLocalStorage()
  },

  convertToEmotional: (structRelId, emotionalType) => {
    const state = get()
    const rel = state.structuralRelationships[structRelId]
    if (!rel) return null
    // Create emotional relationship with same connections
    const id = uuidv4()
    const isDirected = [
      EmotionalRelType.Violence, EmotionalRelType.PhysicalAbuse,
      EmotionalRelType.EmotionalAbuse, EmotionalRelType.SexualAbuse,
      EmotionalRelType.Neglect, EmotionalRelType.FocusedOn,
      EmotionalRelType.FocusedOnNegatively, EmotionalRelType.Manipulative,
      EmotionalRelType.Controlling,
    ].includes(emotionalType)
    const emoRel: EmotionalRelationship = {
      id, type: emotionalType,
      person1Id: rel.person1Id, person2Id: rel.person2Id,
      isDirected, notes: '',
      route: { ...rel.route },
    }
    // Remove structural, add emotional
    const newStruct = { ...state.structuralRelationships }
    delete newStruct[structRelId]
    set({
      structuralRelationships: newStruct,
      emotionalRelationships: { ...state.emotionalRelationships, [id]: emoRel },
      persons: syncPersonParentRefs(state.persons, newStruct),
    })
    get().saveToLocalStorage()
    return id
  },

  convertToStructural: (emoRelId, structuralType) => {
    const state = get()
    const rel = state.emotionalRelationships[emoRelId]
    if (!rel) return null
    const id = uuidv4()
    const structRel: StructuralRelationship = {
      id, type: structuralType,
      person1Id: rel.person1Id, person2Id: rel.person2Id,
      startDate: null, endDate: null, children: [],
      route: { ...rel.route },
    }
    const newEmo = { ...state.emotionalRelationships }
    delete newEmo[emoRelId]
    const newStruct = { ...state.structuralRelationships, [id]: structRel }
    set({
      emotionalRelationships: newEmo,
      structuralRelationships: newStruct,
      persons: syncPersonParentRefs(state.persons, newStruct),
    })
    get().saveToLocalStorage()
    return id
  },

  triggerAutoLayout: () => {
    set((state) => ({ layoutVersion: state.layoutVersion + 1 }))
  },

  exportJSON: () => {
    const state = get()
    return JSON.stringify({
      title: state.title,
      persons: state.persons,
      structuralRelationships: state.structuralRelationships,
      emotionalRelationships: state.emotionalRelationships,
      presentationOrder: state.presentationOrder,
      nodePositions: state.nodePositions,
      edgeWaypoints: state.edgeWaypoints,
      metadata: { version: '1.0.0', notes: '' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, null, 2)
  },

  importJSON: (json) => {
    try {
      const data = JSON.parse(json)
      const persons = data.persons || {}
      const structuralRels = data.structuralRelationships || {}
      set({
        title: data.title || 'Imported Genogram',
        persons: syncPersonParentRefs(persons, structuralRels),
        structuralRelationships: structuralRels,
        emotionalRelationships: data.emotionalRelationships || {},
        presentationOrder: data.presentationOrder || [],
        nodePositions: data.nodePositions || {},
      })
    } catch {
      console.error('Failed to import genogram data')
    }
  },

  saveToLocalStorage: () => {
    const state = get()
    const data = {
      title: state.title,
      persons: state.persons,
      structuralRelationships: state.structuralRelationships,
      emotionalRelationships: state.emotionalRelationships,
      presentationOrder: state.presentationOrder,
      nodePositions: state.nodePositions,
      edgeWaypoints: state.edgeWaypoints,
    }
    try {
      localStorage.setItem('genogram-data', JSON.stringify(data))
    } catch {
      console.error('Failed to save to localStorage')
    }
  },

  loadFromLocalStorage: () => {
    try {
      const raw = localStorage.getItem('genogram-data')
      if (!raw) return false
      const data = JSON.parse(raw)
      const persons = data.persons || {}
      const structuralRels = data.structuralRelationships || {}
      set({
        title: data.title || 'My Family Genogram',
        persons: syncPersonParentRefs(persons, structuralRels),
        structuralRelationships: structuralRels,
        emotionalRelationships: data.emotionalRelationships || {},
        presentationOrder: data.presentationOrder || [],
        nodePositions: data.nodePositions || {},
        edgeWaypoints: data.edgeWaypoints || {},
      })
      // Re-save immediately so migrated parent refs persist
      get().saveToLocalStorage()
      return true
    } catch {
      return false
    }
  },
}))
