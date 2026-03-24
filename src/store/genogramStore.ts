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
  isPresentationMode: boolean
  presentationIndex: number
  showLegend: boolean
  toolMode: 'hand' | 'pointer' | 'move'
  editingEdgeId: string | null
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

  // Undo
  history: string[]
  historyIndex: number

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
  startAddingRelationship: (sourceId: string, type: 'structural' | 'emotional' | 'child') => void
  cancelAddingRelationship: () => void
  togglePresentationMode: () => void
  setPresentationIndex: (index: number) => void
  toggleLegend: () => void
  setToolMode: (mode: 'hand' | 'pointer' | 'move') => void
  setEditingEdgeId: (id: string | null) => void
  setTitle: (title: string) => void

  // Actions - Positions
  setNodePosition: (id: string, pos: { x: number; y: number }) => void
  setNodePositions: (positions: Record<string, { x: number; y: number }>) => void
  setEdgeWaypoint: (edgeId: string, waypoint: { dropX?: number; barY?: number }) => void
  updateEdgeRoute: (relType: 'structural' | 'emotional', relId: string, route: Partial<import('../types/relationship').EdgeRoute>) => void
  convertToEmotional: (structRelId: string, emotionalType: import('../types/enums').EmotionalRelType) => string | null
  convertToStructural: (emoRelId: string, structuralType: import('../types/enums').StructuralRelType) => string | null
  triggerAutoLayout: () => void

  // Actions - Presentation
  setPresentationOrder: (order: string[]) => void

  // Actions - Persistence
  saveSnapshot: () => void
  undo: () => void
  redo: () => void
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
  isPresentationMode: false,
  presentationIndex: 0,
  showLegend: false,
  toolMode: 'pointer' as const,
  editingEdgeId: null,
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
  }
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
  history: [],
  historyIndex: -1,

  addPerson: (gender, generation = 0) => {
    const person = createDefaultPerson(gender, generation)
    set((state) => ({
      persons: { ...state.persons, [person.id]: person },
    }))
    get().saveSnapshot()
    return person.id
  },

  updatePerson: (id, updates) => {
    set((state) => ({
      persons: {
        ...state.persons,
        [id]: { ...state.persons[id], ...updates },
      },
    }))
    get().saveSnapshot()
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
        persons: newPersons,
        structuralRelationships: newStructural,
        emotionalRelationships: newEmotional,
        presentationOrder: state.presentationOrder.filter((pid) => pid !== id),
        ui: state.ui.selectedPersonId === id ? { ...state.ui, selectedPersonId: null, isPanelOpen: false, panelMode: null } : state.ui,
      }
    })
    get().saveSnapshot()
  },

  addStructuralRelationship: (person1Id, person2Id, type) => {
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
    get().saveSnapshot()
    return id
  },

  updateStructuralRelationship: (id, updates) => {
    set((state) => ({
      structuralRelationships: {
        ...state.structuralRelationships,
        [id]: { ...state.structuralRelationships[id], ...updates },
      },
    }))
    get().saveSnapshot()
  },

  removeStructuralRelationship: (id) => {
    set((state) => {
      const newRels = { ...state.structuralRelationships }
      delete newRels[id]
      return { structuralRelationships: newRels }
    })
    get().saveSnapshot()
  },

  addChildToRelationship: (relId, childId, connectionType) => {
    set((state) => {
      const rel = state.structuralRelationships[relId]
      if (!rel) return state
      const child: ChildConnection = { childId, type: connectionType, attachmentT: 0.5 }
      return {
        structuralRelationships: {
          ...state.structuralRelationships,
          [relId]: { ...rel, children: [...rel.children, child] },
        },
      }
    })
    get().saveSnapshot()
  },

  removeChildFromRelationship: (relId, childId) => {
    set((state) => {
      const rel = state.structuralRelationships[relId]
      if (!rel) return state
      return {
        structuralRelationships: {
          ...state.structuralRelationships,
          [relId]: { ...rel, children: rel.children.filter((c) => c.childId !== childId) },
        },
      }
    })
    get().saveSnapshot()
  },

  addEmotionalRelationship: (person1Id, person2Id, type) => {
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
    get().saveSnapshot()
    return id
  },

  updateEmotionalRelationship: (id, updates) => {
    set((state) => ({
      emotionalRelationships: {
        ...state.emotionalRelationships,
        [id]: { ...state.emotionalRelationships[id], ...updates },
      },
    }))
    get().saveSnapshot()
  },

  removeEmotionalRelationship: (id) => {
    set((state) => {
      const newRels = { ...state.emotionalRelationships }
      delete newRels[id]
      return { emotionalRelationships: newRels }
    })
    get().saveSnapshot()
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

  startAddingRelationship: (sourceId, type) => {
    set((state) => ({
      ui: { ...state.ui, isAddingRelationship: true, relationshipSourceId: sourceId, addRelationshipType: type },
    }))
  },

  cancelAddingRelationship: () => {
    set((state) => ({
      ui: { ...state.ui, isAddingRelationship: false, relationshipSourceId: null, addRelationshipType: null },
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
    set({
      emotionalRelationships: newEmo,
      structuralRelationships: { ...state.structuralRelationships, [id]: structRel },
    })
    get().saveToLocalStorage()
    return id
  },

  triggerAutoLayout: () => {
    set((state) => ({ layoutVersion: state.layoutVersion + 1 }))
  },

  saveSnapshot: () => {
    // Debounce auto-save
    const state = get()
    state.saveToLocalStorage()
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      const prev = JSON.parse(history[historyIndex - 1])
      set({ ...prev, historyIndex: historyIndex - 1, history })
    }
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < history.length - 1) {
      const next = JSON.parse(history[historyIndex + 1])
      set({ ...next, historyIndex: historyIndex + 1, history })
    }
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
      set({
        title: data.title || 'Imported Genogram',
        persons: data.persons || {},
        structuralRelationships: data.structuralRelationships || {},
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
      set({
        title: data.title || 'My Family Genogram',
        persons: data.persons || {},
        structuralRelationships: data.structuralRelationships || {},
        emotionalRelationships: data.emotionalRelationships || {},
        presentationOrder: data.presentationOrder || [],
        nodePositions: data.nodePositions || {},
        edgeWaypoints: data.edgeWaypoints || {},
      })
      return true
    } catch {
      return false
    }
  },
}))
