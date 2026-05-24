import type { Gender, PregnancyType, ConditionType } from './enums'

export interface Condition {
  type: ConditionType
  inRecovery: boolean
  suspected: boolean
}

export interface Person {
  id: string
  name: string
  dateOfBirth: string | null
  dateOfDeath: string | null
  gender: Gender
  photo: string | null
  conditions: Condition[]
  labels: string[]
  notes: string
  isDeceased: boolean
  pregnancyType: PregnancyType | null
  // generation is derived from the structural relationship graph and computed
  // on-demand by utils/generations.ts — it's not stored on Person.
  parentRelationshipId: string | null  // structural relationship this person is a child of
  parentIds: string[] | null           // [person1Id, person2Id] from parent relationship
}
