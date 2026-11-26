import { beforeEach, describe, expect, it } from 'vitest'
import { catchGoogleRedirect, fromGoogleEvents, takeGoogleToken } from './googleCalendar'

const store = new Map<string, string>()
;(globalThis as unknown as { sessionStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> }).sessionStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => { store.set(k, v) },
  removeItem: k => { store.delete(k) },
}

describe('regresso da Google', () => {
  beforeEach(() => store.clear())

  it('aceita o token só com o state certo e usa-o uma vez', () => {
    store.set('gcal-state', JSON.stringify({ state: 's1', back: '/saude?tab=tratamento&sub=lembretes' }))
    const back = catchGoogleRedirect('#state=s1&access_token=tok&token_type=Bearer&expires_in=3599&scope=https://www.googleapis.com/auth/calendar.events.readonly')
    expect(back).toBe('/saude?tab=tratamento&sub=lembretes')
    expect(store.has('gcal-state')).toBe(false)
    expect(takeGoogleToken()).toEqual({ token: 'tok' })
    expect(takeGoogleToken()).toBeNull()
  })

  it('recusa um state diferente (outro site a tentar injetar um token)', () => {
    store.set('gcal-state', JSON.stringify({ state: 's1', back: '/x' }))
    catchGoogleRedirect('#state=outro&access_token=tok&scope=calendar')
    expect(takeGoogleToken()).toEqual({ error: 'state' })
  })

  it('passa o erro quando a pessoa cancela', () => {
    store.set('gcal-state', JSON.stringify({ state: 's1', back: '/x' }))
    catchGoogleRedirect('#error=access_denied&state=s1')
    expect(takeGoogleToken()).toEqual({ error: 'access_denied' })
  })

  it('ignora rotas normais da app', () => {
    expect(catchGoogleRedirect('#/saude?tab=tratamento')).toBeNull()
  })
})

describe('eventos da Google', () => {
  it('usa o iCalUID, fica com a próxima ocorrência e ignora cancelados', () => {
    const evs = fromGoogleEvents([
      { id: 'a_1', iCalUID: 'gel@google.com', recurringEventId: 'a', summary: 'Gel', start: { dateTime: '2026-11-27T08:00:00Z' } },
      { id: 'a_2', iCalUID: 'gel@google.com', recurringEventId: 'a', summary: 'Gel', start: { dateTime: '2026-12-04T08:00:00Z' } },
      { id: 'b', iCalUID: 'b@google.com', status: 'cancelled', summary: 'Cancelado', start: { dateTime: '2026-12-01T08:00:00Z' } },
      { id: 'c', iCalUID: 'c@google.com', summary: 'Análises', location: ' USF ', description: '<b>Jejum</b> de 8h', start: { date: '2026-12-03' } },
    ])
    expect(evs.map(e => e.uid)).toEqual(['gel@google.com', 'c@google.com'])
    expect(evs[1]).toMatchObject({ allDay: true, location: 'USF', description: 'Jejum de 8h' })
    expect(evs[1].start.getDate()).toBe(3)
  })
})
