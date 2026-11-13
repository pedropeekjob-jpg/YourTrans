import { useEffect, useState } from 'react'
import { api, apiEnabled } from './api'
import type { SealEntity } from '../data/seal'

let cache: SealEntity[] | null = null

/** Entidades registadas para o Selo Casulo (lista vazia sem ligação ao servidor). */
export function useEntities(): { entities: SealEntity[]; loaded: boolean } {
  const [entities, setEntities] = useState<SealEntity[]>(cache ?? [])
  const [loaded, setLoaded] = useState(!!cache || !apiEnabled)
  useEffect(() => {
    if (!apiEnabled) return
    api.entities().then(list => { cache = list; setEntities(list) }).catch(() => {}).finally(() => setLoaded(true))
  }, [])
  return { entities, loaded }
}
