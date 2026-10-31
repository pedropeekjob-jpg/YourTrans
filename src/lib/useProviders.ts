import { useEffect, useState } from 'react'
import { publicProviders, type Provider } from '../data/health'
import { api, apiEnabled } from './api'

let cache: Provider[] | null = null

export function useProviders(): { providers: Provider[]; online: boolean } {
  const [list, setList] = useState<Provider[]>(cache ?? publicProviders)
  const [online, setOnline] = useState(false)
  useEffect(() => {
    if (!apiEnabled) return
    api.providers()
      .then(remote => {
        cache = [...publicProviders, ...remote]
        setList(cache); setOnline(true)
      })
      .catch(() => setOnline(false))
  }, [])
  return { providers: list, online }
}
