import { describe, expect, it } from 'vitest'

import { CLASSES } from '../antibacterials/classes'
import { AGENTS, STAGES } from './algorithm'
import { AGENT_CLASSES, STEP_CLASSES } from './class-links'
import { COMPLICATION_STAGES } from './complications'

const classIds = new Set(CLASSES.map((cls) => cls.id))
const stages = [...STAGES, ...COMPLICATION_STAGES]

describe('links from the febrile neutropenia algorithm to the antibacterial reference', () => {
  it('names only classes the reference has a card for', () => {
    const ids = [...Object.values(STEP_CLASSES).flat(2), ...Object.values(AGENT_CLASSES).flat()]
    expect(ids.length).toBeGreaterThan(20)
    for (const id of ids) expect(classIds.has(id), id).toBe(true)
  })

  it('has one list per step of an existing stage, so a new step cannot shift the links', () => {
    for (const [stageId, perStep] of Object.entries(STEP_CLASSES)) {
      const stage = stages.find((candidate) => candidate.id === stageId)
      expect(stage, stageId).toBeDefined()
      expect(perStep.length, stageId).toBe(stage?.steps.length)
    }
  })

  it('ties every agent key to a drug of the table', () => {
    const names = new Set(AGENTS.flatMap(({ agents }) => agents.map((agent) => agent.name.en)))
    for (const name of Object.keys(AGENT_CLASSES)) expect(names.has(name), name).toBe(true)
  })
})
