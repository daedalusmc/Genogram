import { useCallback } from 'react'
import type { Person } from '../types/person'
import type { StructuralRelationship } from '../types/relationship'

const NODE_WIDTH = 120
const NODE_HEIGHT = 100
const GENERATION_GAP = 220
const COUPLE_GAP = 160
const SIBLING_GAP = 140

export function useAutoLayout() {
  const layoutNodes = useCallback((
    persons: Record<string, Person>,
    structuralRels: Record<string, StructuralRelationship>,
  ): Record<string, { x: number; y: number }> => {
    const personList = Object.values(persons)
    if (personList.length === 0) return {}

    // Simple hierarchical layout without dagre (which crashes on complex graphs)
    // Strategy: place couples side by side, children centered below

    const positions: Record<string, { x: number; y: number }> = {}
    const placed = new Set<string>()

    // 1. Identify generations: people in couples are generation based on their .generation field
    //    Children are one generation below their parents
    const childOf = new Map<string, string>() // childId -> relId
    for (const rel of Object.values(structuralRels)) {
      for (const child of rel.children) {
        childOf.set(child.childId, rel.id)
      }
    }

    // 2. Group by generation
    const generations: Record<number, string[]> = {}
    for (const person of personList) {
      const gen = person.generation
      if (!generations[gen]) generations[gen] = []
      generations[gen].push(person.id)
    }

    // 3. Layout each generation
    const genKeys = Object.keys(generations).map(Number).sort((a, b) => a - b)

    for (const gen of genKeys) {
      const genY = gen * GENERATION_GAP
      const ids = generations[gen]

      // Find couples in this generation
      const couplesInGen: StructuralRelationship[] = []
      const inCouple = new Set<string>()

      for (const rel of Object.values(structuralRels)) {
        if (ids.includes(rel.person1Id) && ids.includes(rel.person2Id)) {
          couplesInGen.push(rel)
          inCouple.add(rel.person1Id)
          inCouple.add(rel.person2Id)
        }
      }

      // Singles in this generation (not in any couple)
      const singles = ids.filter((id) => !inCouple.has(id))

      // Place couples first
      let xCursor = 0

      for (const rel of couplesInGen) {
        const person1 = persons[rel.person1Id]
        const person2 = persons[rel.person2Id]
        if (!person1 || !person2) continue

        // Determine left/right by gender convention (male left)
        const p1IsMale = ['male', 'gay-male', 'trans-ftm'].includes(person1.gender)
        const p2IsMale = ['male', 'gay-male', 'trans-ftm'].includes(person2.gender)

        let leftId = rel.person1Id
        let rightId = rel.person2Id
        if (!p1IsMale && p2IsMale) {
          leftId = rel.person2Id
          rightId = rel.person1Id
        }

        positions[leftId] = { x: xCursor, y: genY }
        positions[rightId] = { x: xCursor + COUPLE_GAP, y: genY }
        placed.add(leftId)
        placed.add(rightId)

        // Center children below this couple
        if (rel.children.length > 0) {
          const lineMidX = (xCursor + NODE_WIDTH + xCursor + COUPLE_GAP) / 2
          const childY = genY + GENERATION_GAP
          const totalChildWidth = rel.children.length * NODE_WIDTH + (rel.children.length - 1) * SIBLING_GAP
          const childStartX = lineMidX - totalChildWidth / 2

          rel.children.forEach((child, i) => {
            if (persons[child.childId]) {
              positions[child.childId] = {
                x: childStartX + i * (NODE_WIDTH + SIBLING_GAP),
                y: childY,
              }
              placed.add(child.childId)
            }
          })
        }

        xCursor += COUPLE_GAP + NODE_WIDTH + SIBLING_GAP
      }

      // Place singles after couples
      for (const id of singles) {
        if (!placed.has(id)) {
          positions[id] = { x: xCursor, y: genY }
          placed.add(id)
          xCursor += NODE_WIDTH + SIBLING_GAP
        }
      }
    }

    // 4. Place any remaining unplaced people
    let xFallback = 0
    for (const person of personList) {
      if (!placed.has(person.id)) {
        positions[person.id] = { x: xFallback, y: person.generation * GENERATION_GAP }
        xFallback += NODE_WIDTH + SIBLING_GAP
      }
    }

    return positions
  }, [])

  return { layoutNodes }
}
