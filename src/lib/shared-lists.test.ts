// As listas fechadas existem em dois sítios: no servidor (para validar) e na app (para mostrar).
// Se uma mudar sem a outra, a app passa a enviar valores que o servidor recusa. Este teste apanha isso.
import { describe, expect, it } from 'vitest'
// @ts-expect-error módulo do servidor em JavaScript, sem tipos
import * as server from '../../server/validation.mjs'
import { storyPhases, storyTopics } from '../data/stories'
import { entityKinds, sealCommitments, sealQuestions, SEAL_MIN_REVIEWS, SEAL_THRESHOLD } from '../data/seal'
import { tracks } from '../data/healthPath'

describe('listas partilhadas entre app e servidor', () => {
  it('temas e fases dos testemunhos', () => {
    expect(storyTopics.map(t => t.id)).toEqual(server.STORY_TOPICS)
    expect(storyPhases.map(p => p.id)).toEqual(server.STORY_PHASES)
  })
  it('Selo Casulo', () => {
    expect(entityKinds).toEqual(server.ENTITY_KINDS)
    expect(sealCommitments.map(c => c.id)).toEqual(server.SEAL_COMMITMENTS)
    expect(sealQuestions.map(q => q.id)).toEqual(server.SEAL_QUESTIONS)
    expect(SEAL_MIN_REVIEWS).toBe(server.SEAL_MIN_REVIEWS)
    expect(SEAL_THRESHOLD).toBe(server.SEAL_THRESHOLD)
  })
  it('as partes do percurso de saúde que o servidor aceita existem na app', () => {
    const ids = new Set(tracks.map(t => t.id))
    for (const t of server.TRACKS) expect(ids.has(t), t).toBe(true)
  })
})
