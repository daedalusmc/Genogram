import type { Person } from '../types/person'
import type { StructuralRelationship } from '../types/relationship'

/**
 * Compute generation levels for every person from the parent-child graph.
 *
 * Generation numbers are RELATIVE — whoever currently has no parents in the
 * graph gets gen=0, their children get gen=1, etc. Adding a great-grandparent
 * just re-roots: the new ancestor becomes gen=0 and the rest of the tree
 * shifts to bigger numbers. We never need negative generations.
 *
 * Pure function — no store writes, no side effects. Call it whenever you
 * actually need the data; the cost is O(persons + structural rels), which is
 * fine to run inside layout or render.
 */
export function computeGenerations(
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

  // Roots: persons who aren't a child of any structural relationship
  const allIds = Object.keys(persons)
  const childIds = new Set(Object.keys(childToRel))
  const roots = allIds.filter((id) => !childIds.has(id))

  const generations: Record<string, number> = {}

  // BFS from roots. Partners share a generation; children get parent gen + 1.
  const queue: Array<{ id: string; gen: number }> = roots.map((id) => ({ id, gen: 0 }))
  const visited = new Set<string>()

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    generations[id] = gen

    for (const rel of Object.values(structuralRels)) {
      if (rel.person1Id === id && !visited.has(rel.person2Id)) {
        queue.push({ id: rel.person2Id, gen })
      } else if (rel.person2Id === id && !visited.has(rel.person1Id)) {
        queue.push({ id: rel.person1Id, gen })
      }
      if (rel.person1Id === id || rel.person2Id === id) {
        for (const child of rel.children) {
          if (!visited.has(child.childId)) {
            queue.push({ id: child.childId, gen: gen + 1 })
          }
        }
      }
    }
  }

  // Anyone still unvisited (no relationships) defaults to 0.
  for (const id of allIds) {
    if (!(id in generations)) generations[id] = 0
  }

  return generations
}
