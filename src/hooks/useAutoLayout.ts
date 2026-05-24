import { useCallback } from 'react'
import type { Person } from '../types/person'
import type { StructuralRelationship } from '../types/relationship'

const NODE_WIDTH = 120
const GENERATION_GAP = 240
const COUPLE_GAP = 40      // gap between partners in a couple
const SIBLING_GAP = 80     // gap between siblings
const FAMILY_GAP = 120     // gap between separate root family branches
const COUPLE_UNIT_W = NODE_WIDTH * 2 + COUPLE_GAP

/**
 * Tree-based genogram auto-layout.
 *
 * 1. Build "family unit" trees: couple → children → their families
 * 2. Bottom-up: compute subtree widths
 * 3. Top-down: position couples centered over their children
 * 4. Cross-branch marriages: when a child marries someone from another branch,
 *    the marriage is assigned to whichever branch claims it first.
 *    The marrying-in spouse is pulled into that branch's subtree.
 */

interface FamilyUnit {
  relId: string
  leftId: string
  rightId: string
  childUnits: FamilyUnit[]
  leafChildren: string[]
}

export function useAutoLayout() {
  const layoutNodes = useCallback((
    persons: Record<string, Person>,
    structuralRels: Record<string, StructuralRelationship>,
  ): Record<string, { x: number; y: number }> => {
    const personList = Object.values(persons)
    if (personList.length === 0) return {}

    const positions: Record<string, { x: number; y: number }> = {}
    const placed = new Set<string>()

    // --- Lookup maps ---

    // childId → relId (the couple this person is a child of)
    const childOfRel = new Map<string, string>()
    for (const rel of Object.values(structuralRels)) {
      for (const child of rel.children) {
        childOfRel.set(child.childId, rel.id)
      }
    }

    // personId → relIds (couples this person is a partner in)
    const partnerInRel = new Map<string, string[]>()
    for (const rel of Object.values(structuralRels)) {
      if (!partnerInRel.has(rel.person1Id)) partnerInRel.set(rel.person1Id, [])
      if (!partnerInRel.has(rel.person2Id)) partnerInRel.set(rel.person2Id, [])
      partnerInRel.get(rel.person1Id)!.push(rel.id)
      partnerInRel.get(rel.person2Id)!.push(rel.id)
    }

    // --- Determine left/right in a couple (male convention: male on left) ---

    const MALE_TYPES = new Set(['male', 'gay-male', 'trans-ftm'])

    // Pick which partner goes on the left for visual layout. Mixed-gender
    // couples use the male-on-left convention. Same-gender couples fall back
    // to (older DOB, then lower id) so the layout doesn't reshuffle when the
    // user adds new relationships in a different order.
    function determineLR(rel: StructuralRelationship): [string, string] {
      const p1 = persons[rel.person1Id]
      const p2 = persons[rel.person2Id]
      if (!p1 || !p2) return [rel.person1Id, rel.person2Id]

      const p1Male = MALE_TYPES.has(p1.gender)
      const p2Male = MALE_TYPES.has(p2.gender)
      if (p1Male && !p2Male) return [rel.person1Id, rel.person2Id]
      if (!p1Male && p2Male) return [rel.person2Id, rel.person1Id]

      if (p1.dateOfBirth && p2.dateOfBirth && p1.dateOfBirth !== p2.dateOfBirth) {
        return p1.dateOfBirth < p2.dateOfBirth
          ? [rel.person1Id, rel.person2Id]
          : [rel.person2Id, rel.person1Id]
      }
      return rel.person1Id < rel.person2Id
        ? [rel.person1Id, rel.person2Id]
        : [rel.person2Id, rel.person1Id]
    }

    // --- Build family unit trees ---

    const visitedRels = new Set<string>()
    const assignedToBranch = new Set<string>() // person IDs assigned to a branch

    function buildFamilyUnit(relId: string): FamilyUnit | null {
      if (visitedRels.has(relId)) return null
      visitedRels.add(relId)

      const rel = structuralRels[relId]
      if (!rel) return null

      const [leftId, rightId] = determineLR(rel)
      assignedToBranch.add(leftId)
      assignedToBranch.add(rightId)

      const childUnits: FamilyUnit[] = []
      const leafChildren: string[] = []

      // Sort children: DOB primary, child id as deterministic tiebreaker.
      const sortedChildren = [...rel.children].sort((a, b) => {
        const pa = persons[a.childId]
        const pb = persons[b.childId]
        if (!pa || !pb) return a.childId.localeCompare(b.childId)
        if (pa.dateOfBirth && pb.dateOfBirth && pa.dateOfBirth !== pb.dateOfBirth) {
          return pa.dateOfBirth.localeCompare(pb.dateOfBirth)
        }
        return a.childId.localeCompare(b.childId)
      })

      for (const child of sortedChildren) {
        const cid = child.childId
        if (!persons[cid]) continue

        // Sort this child's marriages deterministically so the order they're
        // processed doesn't depend on the order rels were inserted.
        const childRels = [...(partnerInRel.get(cid) || [])].sort((a, b) => {
          const ra = structuralRels[a]
          const rb = structuralRels[b]
          if (!ra || !rb) return a.localeCompare(b)
          const aDob = earliestDob(ra)
          const bDob = earliestDob(rb)
          if (aDob !== bDob) return aDob.localeCompare(bDob)
          const aStart = ra.startDate || ''
          const bStart = rb.startDate || ''
          if (aStart !== bStart) return aStart.localeCompare(bStart)
          return a.localeCompare(b)
        })
        let childHasFamily = false

        for (const childRelId of childRels) {
          const fu = buildFamilyUnit(childRelId)
          if (fu) {
            childUnits.push(fu)
            childHasFamily = true
          }
        }

        if (!childHasFamily) {
          leafChildren.push(cid)
          assignedToBranch.add(cid)
        }
      }

      return { relId, leftId, rightId, childUnits, leafChildren }
    }

    // Find root couples: couples where neither partner is a child of another couple,
    // OR the oldest generation couples
    const relList = Object.values(structuralRels)

    // Sort root rels: roots first, then by generation, with deterministic
    // tiebreakers so the layout doesn't reshuffle when new rels are added.
    const earliestDob = (rel: StructuralRelationship): string => {
      const dobs = [persons[rel.person1Id]?.dateOfBirth, persons[rel.person2Id]?.dateOfBirth]
        .filter((d): d is string => Boolean(d))
        .sort()
      return dobs[0] || ''
    }

    const sortedRels = [...relList].sort((a, b) => {
      const aIsRoot = !childOfRel.has(a.person1Id) && !childOfRel.has(a.person2Id)
      const bIsRoot = !childOfRel.has(b.person1Id) && !childOfRel.has(b.person2Id)
      if (aIsRoot !== bIsRoot) return aIsRoot ? -1 : 1

      const aGen = Math.min(persons[a.person1Id]?.generation ?? 99, persons[a.person2Id]?.generation ?? 99)
      const bGen = Math.min(persons[b.person1Id]?.generation ?? 99, persons[b.person2Id]?.generation ?? 99)
      if (aGen !== bGen) return aGen - bGen

      const aDob = earliestDob(a)
      const bDob = earliestDob(b)
      if (aDob !== bDob) return aDob.localeCompare(bDob)

      return a.id.localeCompare(b.id)
    })

    const rootUnits: FamilyUnit[] = []
    for (const rel of sortedRels) {
      if (visitedRels.has(rel.id)) continue
      const unit = buildFamilyUnit(rel.id)
      if (unit) rootUnits.push(unit)
    }

    // --- Compute subtree widths (bottom-up) ---

    const unitWidths = new Map<string, number>()

    function computeWidth(unit: FamilyUnit): number {
      let childrenWidth = 0

      for (const cu of unit.childUnits) {
        if (childrenWidth > 0) childrenWidth += SIBLING_GAP
        childrenWidth += computeWidth(cu)
      }

      for (let i = 0; i < unit.leafChildren.length; i++) {
        if (childrenWidth > 0) childrenWidth += SIBLING_GAP
        childrenWidth += NODE_WIDTH
      }

      // The couple itself needs at minimum COUPLE_UNIT_W
      const width = Math.max(COUPLE_UNIT_W, childrenWidth)
      unitWidths.set(unit.relId, width)
      return width
    }

    for (const root of rootUnits) {
      computeWidth(root)
    }

    // --- Position nodes (top-down) ---

    function positionUnit(unit: FamilyUnit, centerX: number, y: number) {
      // Place the couple centered at centerX. If a partner is already placed
      // (they're in a previous marriage in this layout), don't move them —
      // place only the new spouse so multi-marriage layouts stay sane.
      const coupleLeftX = centerX - COUPLE_UNIT_W / 2
      if (!placed.has(unit.leftId)) {
        positions[unit.leftId] = { x: coupleLeftX, y }
        placed.add(unit.leftId)
      }
      if (!placed.has(unit.rightId)) {
        positions[unit.rightId] = { x: coupleLeftX + NODE_WIDTH + COUPLE_GAP, y }
        placed.add(unit.rightId)
      }

      // Gather all children with their widths
      const childEntries: { type: 'unit' | 'leaf'; unit?: FamilyUnit; id?: string; width: number }[] = []

      for (const cu of unit.childUnits) {
        childEntries.push({
          type: 'unit',
          unit: cu,
          width: unitWidths.get(cu.relId) || COUPLE_UNIT_W,
        })
      }
      for (const lid of unit.leafChildren) {
        childEntries.push({
          type: 'leaf',
          id: lid,
          width: NODE_WIDTH,
        })
      }

      if (childEntries.length === 0) return

      const totalChildWidth = childEntries.reduce((a, e) => a + e.width, 0) +
        (childEntries.length - 1) * SIBLING_GAP

      let childX = centerX - totalChildWidth / 2
      const childY = y + GENERATION_GAP

      for (const entry of childEntries) {
        if (entry.type === 'unit' && entry.unit) {
          const childCenterX = childX + entry.width / 2
          positionUnit(entry.unit, childCenterX, childY)
        } else if (entry.type === 'leaf' && entry.id) {
          positions[entry.id] = { x: childX, y: childY }
          placed.add(entry.id)
        }
        childX += entry.width + SIBLING_GAP
      }
    }

    // Position root units side by side
    let rootX = 0
    for (const root of rootUnits) {
      const w = unitWidths.get(root.relId) || COUPLE_UNIT_W
      const centerX = rootX + w / 2

      const p1Gen = persons[root.leftId]?.generation ?? 0
      const p2Gen = persons[root.rightId]?.generation ?? 0
      const rootY = Math.min(p1Gen, p2Gen) * GENERATION_GAP

      positionUnit(root, centerX, rootY)
      rootX += w + FAMILY_GAP
    }

    // --- Place remaining unplaced people ---
    // Group by generation for a cleaner fallback
    const unplaced = personList.filter((p) => !placed.has(p.id))
    if (unplaced.length > 0) {
      const genGroups: Record<number, Person[]> = {}
      for (const p of unplaced) {
        if (!genGroups[p.generation]) genGroups[p.generation] = []
        genGroups[p.generation].push(p)
      }

      let fallbackX = rootX + FAMILY_GAP
      for (const gen of Object.keys(genGroups).map(Number).sort((a, b) => a - b)) {
        let x = fallbackX
        for (const p of genGroups[gen]) {
          positions[p.id] = { x, y: gen * GENERATION_GAP }
          placed.add(p.id)
          x += NODE_WIDTH + SIBLING_GAP
        }
      }
    }

    return positions
  }, [])

  return { layoutNodes }
}
