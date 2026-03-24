import type { Person } from './person'
import type { StructuralRelationship, EmotionalRelationship } from './relationship'

export interface GenogramData {
  title: string
  createdAt: string
  updatedAt: string
  persons: Record<string, Person>
  structuralRelationships: Record<string, StructuralRelationship>
  emotionalRelationships: Record<string, EmotionalRelationship>
  presentationOrder: string[]
  metadata: {
    version: string
    notes: string
  }
}
