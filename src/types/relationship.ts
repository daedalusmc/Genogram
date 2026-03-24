import type { StructuralRelType, ChildConnectionType, EmotionalRelType } from './enums'

export interface EdgeRoute {
  sourceHandle: string | null  // snap point ID on source, null = auto
  targetHandle: string | null  // snap point ID on target, null = auto
  waypoints: Array<{ x: number; y: number }>  // intermediate points the line passes through
}

export interface ChildConnection {
  childId: string
  type: ChildConnectionType
  attachmentT: number  // 0.0=left end, 1.0=right end, 0.5=midpoint of parent couple line
  twinSiblingId?: string
  isIdenticalTwin?: boolean
}

export interface StructuralRelationship {
  id: string
  type: StructuralRelType
  person1Id: string
  person2Id: string
  startDate: string | null
  endDate: string | null
  children: ChildConnection[]
  route: EdgeRoute
}

export interface EmotionalRelationship {
  id: string
  type: EmotionalRelType
  person1Id: string
  person2Id: string
  isDirected: boolean
  notes: string
  route: EdgeRoute
}
