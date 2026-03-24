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
  generation: number
}
