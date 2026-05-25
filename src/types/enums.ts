export enum Gender {
  Male = 'male',
  Female = 'female',
  TransFtoM = 'trans-ftm',
  TransMtoF = 'trans-mtf',
  GayMale = 'gay-male',
  Lesbian = 'lesbian',
  NonBinary = 'non-binary',
  Unknown = 'unknown',
  Pet = 'pet',
}

export enum PregnancyType {
  Pregnancy = 'pregnancy',
  Miscarriage = 'miscarriage',
  Abortion = 'abortion',
  Stillborn = 'stillborn',
}

export enum ConditionType {
  Gambling = 'gambling',
  DrugAbuse = 'drug-abuse',
  Alcoholism = 'alcoholism',
  Depression = 'depression',
  Anxiety = 'anxiety',
  Obesity = 'obesity',
  Cancer = 'cancer',
  HeartDisease = 'heart-disease',
  Hypertension = 'hypertension',
  Diabetes = 'diabetes',
  Arthritis = 'arthritis',
  Autism = 'autism',
  Alzheimers = 'alzheimers',
  PhysicalIllness = 'physical-illness',
  MentalIllness = 'mental-illness',
}

export enum StructuralRelType {
  Marriage = 'marriage',
  Separation = 'separation',
  LegalSeparation = 'legal-separation',
  Divorce = 'divorce',
  Cohabitation = 'cohabitation',
  Engagement = 'engagement',
  Widowed = 'widowed',
  CasualRelationship = 'casual',
  LoveAffair = 'love-affair',
}

export enum ChildConnectionType {
  Biological = 'biological',
  Adopted = 'adopted',
  Foster = 'foster',
}

export enum EmotionalRelType {
  Normal = 'normal',
  Close = 'close',
  VeryClose = 'very-close',
  Distant = 'distant',
  Indifferent = 'indifferent',
  Estranged = 'estranged',
  CutoffRepaired = 'cutoff-repaired',
  Conflictual = 'conflictual',
  Hostile = 'hostile',
  DistantHostile = 'distant-hostile',
  CloseHostile = 'close-hostile',
  Fused = 'fused',
  FusedHostile = 'fused-hostile',
  Violence = 'violence',
  DistantViolence = 'distant-violence',
  CloseViolence = 'close-violence',
  FusedViolence = 'fused-violence',
  PhysicalAbuse = 'physical-abuse',
  EmotionalAbuse = 'emotional-abuse',
  SexualAbuse = 'sexual-abuse',
  Neglect = 'neglect',
  FocusedOn = 'focused-on',
  FocusedOnNegatively = 'focused-on-negatively',
  Manipulative = 'manipulative',
  Controlling = 'controlling',
  Love = 'love',
  Harmony = 'harmony',
  Friendship = 'friendship',
  Distrust = 'distrust',
}

export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.Male]: 'Male',
  [Gender.Female]: 'Female',
  [Gender.TransFtoM]: 'Transgender (F→M)',
  [Gender.TransMtoF]: 'Transgender (M→F)',
  [Gender.GayMale]: 'Gay Male',
  [Gender.Lesbian]: 'Lesbian',
  [Gender.NonBinary]: 'Non-Binary',
  [Gender.Unknown]: 'Unknown',
  [Gender.Pet]: 'Pet',
}

export const STRUCTURAL_REL_LABELS: Record<StructuralRelType, string> = {
  [StructuralRelType.Marriage]: 'Marriage',
  [StructuralRelType.Separation]: 'Separation',
  [StructuralRelType.LegalSeparation]: 'Legal Separation',
  [StructuralRelType.Divorce]: 'Divorce',
  [StructuralRelType.Cohabitation]: 'Cohabitation',
  [StructuralRelType.Engagement]: 'Engagement',
  [StructuralRelType.Widowed]: 'Widowed',
  [StructuralRelType.CasualRelationship]: 'Casual Relationship',
  [StructuralRelType.LoveAffair]: 'Love Affair',
}

export const EMOTIONAL_REL_LABELS: Record<EmotionalRelType, string> = {
  [EmotionalRelType.Normal]: 'Normal',
  [EmotionalRelType.Close]: 'Close',
  [EmotionalRelType.VeryClose]: 'Very Close',
  [EmotionalRelType.Distant]: 'Distant',
  [EmotionalRelType.Indifferent]: 'Indifferent/Apathetic',
  [EmotionalRelType.Estranged]: 'Cutoff/Estranged',
  [EmotionalRelType.CutoffRepaired]: 'Cutoff Repaired',
  [EmotionalRelType.Conflictual]: 'Discord/Conflict',
  [EmotionalRelType.Hostile]: 'Hostile',
  [EmotionalRelType.DistantHostile]: 'Distant-Hostile',
  [EmotionalRelType.CloseHostile]: 'Close-Hostile',
  [EmotionalRelType.Fused]: 'Fused',
  [EmotionalRelType.FusedHostile]: 'Fused-Hostile',
  [EmotionalRelType.Violence]: 'Violence',
  [EmotionalRelType.DistantViolence]: 'Distant-Violence',
  [EmotionalRelType.CloseViolence]: 'Close-Violence',
  [EmotionalRelType.FusedViolence]: 'Fused-Violence',
  [EmotionalRelType.PhysicalAbuse]: 'Physical Abuse',
  [EmotionalRelType.EmotionalAbuse]: 'Emotional Abuse',
  [EmotionalRelType.SexualAbuse]: 'Sexual Abuse',
  [EmotionalRelType.Neglect]: 'Neglect',
  [EmotionalRelType.FocusedOn]: 'Focused On',
  [EmotionalRelType.FocusedOnNegatively]: 'Focused On Negatively',
  [EmotionalRelType.Manipulative]: 'Manipulative',
  [EmotionalRelType.Controlling]: 'Controlling',
  [EmotionalRelType.Love]: 'Love',
  [EmotionalRelType.Harmony]: 'Harmony',
  [EmotionalRelType.Friendship]: 'Friendship',
  [EmotionalRelType.Distrust]: 'Distrust',
}

export const CONDITION_COLORS: Record<ConditionType, string> = {
  [ConditionType.Gambling]: '#dc2626',
  [ConditionType.DrugAbuse]: '#f97316',
  [ConditionType.Alcoholism]: '#eab308',
  [ConditionType.Depression]: '#22c55e',
  [ConditionType.Anxiety]: '#f59e0b',
  [ConditionType.Obesity]: '#14b8a6',
  [ConditionType.Cancer]: '#3b82f6',
  [ConditionType.HeartDisease]: '#ef4444',
  [ConditionType.Hypertension]: '#a855f7',
  [ConditionType.Diabetes]: '#06b6d4',
  [ConditionType.Arthritis]: '#8b5cf6',
  [ConditionType.Autism]: '#ec4899',
  [ConditionType.Alzheimers]: '#6366f1',
  [ConditionType.PhysicalIllness]: '#64748b',
  [ConditionType.MentalIllness]: '#475569',
}

// Labels are short role / risk markers shown as small colored pills above
// the person's name on the canvas. We deliberately keep this list short and
// non-overlapping with Conditions (health) and Emotional Relationships
// (abuse, conflict) — those have richer first-class representations.
//
// Removed in 2026-05: MH, AM, SM, D, A (now Conditions); SA, PA, EA (now
// Emotional Relationships). loadFromLocalStorage migrates the health ones
// and drops the abuse ones.
export const LABEL_COLORS: Record<string, string> = {
  LD:  '#7c3aed', // Learning Disability - purple
  PD:  '#f97316', // Physical Disability - orange
  SD:  '#0891b2', // Sensory Disability - cyan
  P:   '#6b7280', // Prison - gray
  CAR: '#dc2626', // Child At Risk - red
  SI:  '#14b8a6', // Severe Illness - teal
  LI:  '#0d9488', // Lifelong Illness - darker teal
}

export const LABEL_NAMES: Record<string, string> = {
  LD:  'Learning Disability',
  PD:  'Physical Disability',
  SD:  'Sensory Disability',
  P:   'Prison',
  CAR: 'Child At Risk',
  SI:  'Severe Illness',
  LI:  'Lifelong Illness',
}

// Maps removed-on-cleanup labels to the condition they should become.
// Used by store load-migration. Abuse labels (SA, PA, EA) have no clean
// auto-target — they're emotional relationships, which need two parties.
export const LEGACY_LABEL_TO_CONDITION: Record<string, ConditionType> = {
  MH: ConditionType.MentalIllness,
  AM: ConditionType.Alcoholism,
  SM: ConditionType.DrugAbuse,
  D:  ConditionType.Depression,
  A:  ConditionType.Anxiety,
}
