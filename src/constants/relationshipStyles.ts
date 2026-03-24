import { EmotionalRelType, StructuralRelType } from '../types/enums'

export interface EdgeStyleConfig {
  stroke: string
  strokeWidth: number
  strokeDasharray?: string
  label: string
  markerEnd?: boolean
  pattern?: 'zigzag' | 'wavy' | 'double-wavy'
  lineCount?: number // 1=single, 2=double, 3=triple
}

export const EMOTIONAL_EDGE_STYLES: Record<EmotionalRelType, EdgeStyleConfig> = {
  [EmotionalRelType.Normal]: { stroke: '#374151', strokeWidth: 2, label: 'Normal', lineCount: 1 },
  [EmotionalRelType.Close]: { stroke: '#374151', strokeWidth: 2, label: 'Close', lineCount: 2 },
  [EmotionalRelType.VeryClose]: { stroke: '#374151', strokeWidth: 2, label: 'Very Close', lineCount: 3 },
  [EmotionalRelType.Distant]: { stroke: '#374151', strokeWidth: 2, strokeDasharray: '8 4', label: 'Distant', lineCount: 1 },
  [EmotionalRelType.Indifferent]: { stroke: '#9ca3af', strokeWidth: 2, strokeDasharray: '2 4', label: 'Indifferent', lineCount: 1 },
  [EmotionalRelType.Estranged]: { stroke: '#374151', strokeWidth: 2, strokeDasharray: '8 4', label: 'Estranged', lineCount: 1 },
  [EmotionalRelType.CutoffRepaired]: { stroke: '#374151', strokeWidth: 2, strokeDasharray: '8 4', label: 'Cutoff Repaired', lineCount: 1 },
  [EmotionalRelType.Conflictual]: { stroke: '#dc2626', strokeWidth: 2, label: 'Conflict', pattern: 'zigzag' },
  [EmotionalRelType.Hostile]: { stroke: '#dc2626', strokeWidth: 2, label: 'Hostile', pattern: 'zigzag', lineCount: 1 },
  [EmotionalRelType.DistantHostile]: { stroke: '#dc2626', strokeWidth: 2, strokeDasharray: '8 4', label: 'Distant-Hostile', pattern: 'zigzag' },
  [EmotionalRelType.CloseHostile]: { stroke: '#dc2626', strokeWidth: 2, label: 'Close-Hostile', pattern: 'zigzag', lineCount: 2 },
  [EmotionalRelType.Fused]: { stroke: '#374151', strokeWidth: 2, label: 'Fused', lineCount: 3 },
  [EmotionalRelType.FusedHostile]: { stroke: '#dc2626', strokeWidth: 2, label: 'Fused-Hostile', pattern: 'zigzag', lineCount: 3 },
  [EmotionalRelType.Violence]: { stroke: '#dc2626', strokeWidth: 3, label: 'Violence', pattern: 'wavy', markerEnd: true },
  [EmotionalRelType.DistantViolence]: { stroke: '#dc2626', strokeWidth: 2, strokeDasharray: '8 4', label: 'Distant-Violence', pattern: 'wavy', markerEnd: true },
  [EmotionalRelType.CloseViolence]: { stroke: '#dc2626', strokeWidth: 3, label: 'Close-Violence', pattern: 'wavy', lineCount: 2, markerEnd: true },
  [EmotionalRelType.FusedViolence]: { stroke: '#dc2626', strokeWidth: 3, label: 'Fused-Violence', pattern: 'wavy', lineCount: 3, markerEnd: true },
  [EmotionalRelType.PhysicalAbuse]: { stroke: '#2563eb', strokeWidth: 3, label: 'Physical Abuse', pattern: 'wavy', markerEnd: true },
  [EmotionalRelType.EmotionalAbuse]: { stroke: '#16a34a', strokeWidth: 3, label: 'Emotional Abuse', pattern: 'wavy', markerEnd: true },
  [EmotionalRelType.SexualAbuse]: { stroke: '#7c3aed', strokeWidth: 3, label: 'Sexual Abuse', pattern: 'double-wavy', markerEnd: true },
  [EmotionalRelType.Neglect]: { stroke: '#374151', strokeWidth: 2, strokeDasharray: '12 6', label: 'Neglect', markerEnd: true },
  [EmotionalRelType.FocusedOn]: { stroke: '#374151', strokeWidth: 2, label: 'Focused On', markerEnd: true },
  [EmotionalRelType.FocusedOnNegatively]: { stroke: '#dc2626', strokeWidth: 2, label: 'Focused On Neg.', markerEnd: true },
  [EmotionalRelType.Manipulative]: { stroke: '#d97706', strokeWidth: 2, label: 'Manipulative', pattern: 'zigzag', markerEnd: true },
  [EmotionalRelType.Controlling]: { stroke: '#d97706', strokeWidth: 2, label: 'Controlling', markerEnd: true },
  [EmotionalRelType.Love]: { stroke: '#ec4899', strokeWidth: 2, label: 'Love', lineCount: 2 },
  [EmotionalRelType.Harmony]: { stroke: '#22c55e', strokeWidth: 2, label: 'Harmony', lineCount: 2 },
  [EmotionalRelType.Friendship]: { stroke: '#22c55e', strokeWidth: 2, strokeDasharray: '6 3', label: 'Friendship', lineCount: 2 },
  [EmotionalRelType.Distrust]: { stroke: '#9333ea', strokeWidth: 2, strokeDasharray: '4 4', label: 'Distrust', pattern: 'zigzag' },
}

export const STRUCTURAL_EDGE_STYLES: Record<StructuralRelType, { strokeDasharray?: string; slashes: number; label: string }> = {
  [StructuralRelType.Marriage]: { label: 'Marriage', slashes: 0 },
  [StructuralRelType.Separation]: { label: 'Separation', slashes: 1 },
  [StructuralRelType.LegalSeparation]: { label: 'Legal Separation', slashes: 2 },
  [StructuralRelType.Divorce]: { label: 'Divorce', slashes: 2 },
  [StructuralRelType.Cohabitation]: { strokeDasharray: '8 4', label: 'Cohabitation', slashes: 0 },
  [StructuralRelType.Engagement]: { strokeDasharray: '4 4', label: 'Engagement', slashes: 0 },
  [StructuralRelType.Widowed]: { label: 'Widowed', slashes: 0 },
  [StructuralRelType.CasualRelationship]: { strokeDasharray: '2 4', label: 'Casual', slashes: 0 },
  [StructuralRelType.LoveAffair]: { strokeDasharray: '6 2 2 2', label: 'Love Affair', slashes: 0 },
}
