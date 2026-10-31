import { useEffect, useState } from 'react'
import { useVault } from '../lib/vault-context'
import { loadPhoto } from '../lib/storage'

// Decifra a fotografia só quando é mostrada; o URL é libertado ao sair.
export function Photo({ id, alt = '', onClick }: { id: string; alt?: string; onClick?: () => void }) {
  const { key } = useVault()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let u: string | null = null
    let alive = true
    if (key) loadPhoto(key, id).then(bytes => {
      if (!bytes || !alive) return
      u = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }))
      setUrl(u)
    })
    return () => { alive = false; if (u) URL.revokeObjectURL(u) }
  }, [id, key])
  return url ? <img src={url} alt={alt} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }} /> : <div style={{ aspectRatio: '1', background: 'var(--surface-2)', borderRadius: 12 }} />
}
