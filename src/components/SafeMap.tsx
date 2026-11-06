// Mapa de locais seguros: MapLibre (open source) + dados do OpenStreetMap.
// Sem Google Maps, sem chave e sem custos. A posição do GPS fica só no telemóvel.
import { useEffect, useRef, useState } from 'react'
import type { Map as MlMap, Marker } from 'maplibre-gl'
import { buildStyle, isDarkTheme, paletteFromTheme } from '../lib/mapStyle'
import { PORTUGAL_CENTER, type LatLng } from '../lib/geo'
import type { Place } from '../lib/types'
import { tr } from '../i18n'

export type MapPlace = Place & LatLng

type Props = {
  places?: MapPlace[]
  user?: LatLng | null
  selected?: string | null
  onSelect?: (id: string | null) => void
  /** Modo de escolha: tocar no mapa marca um ponto. */
  pick?: LatLng | null
  onPick?: (p: LatLng) => void
  height?: number | string
}

const markerEl = (cls: string, label?: string) => {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'map-pin ' + cls
  if (label) el.setAttribute('aria-label', label)
  el.innerHTML = '<span></span>'
  return el
}

export function SafeMap({ places = [], user, selected, onSelect, pick, onPick, height = 380 }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const lib = useRef<typeof import('maplibre-gl') | null>(null)
  const markers = useRef<Marker[]>([])
  const userMarker = useRef<Marker | null>(null)
  const pickMarker = useRef<Marker | null>(null)
  const fitted = useRef(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const cb = useRef({ onSelect, onPick })
  cb.current = { onSelect, onPick }

  // Criação do mapa (biblioteca carregada só quando o mapa é aberto).
  useEffect(() => {
    let cancelled = false
    let mo: MutationObserver | undefined
    let mq: MediaQueryList | undefined
    let dark = isDarkTheme()
    const restyle = () => {
      const now = isDarkTheme()
      if (now !== dark && map.current) { dark = now; map.current.setStyle(buildStyle(paletteFromTheme())) }
    }
    ;(async () => {
      try {
        const ml = await import('maplibre-gl')
        await import('maplibre-gl/dist/maplibre-gl.css')
        if (cancelled || !box.current) return
        lib.current = ml
        const start = pick ?? user ?? PORTUGAL_CENTER
        const m = new ml.Map({
          container: box.current,
          style: buildStyle(paletteFromTheme()),
          center: [start.lng, start.lat],
          zoom: pick || user ? 14 : 5.6,
          attributionControl: { compact: true },
          maxPitch: 60,
          dragRotate: false,
        })
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right')
        m.on('load', () => {
          if (cancelled) return
          box.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
          setReady(true)
        })
        m.on('error', e => { if ((e as { sourceId?: string }).sourceId === 'omt' && !m.loaded()) setFailed(true) })
        m.on('click', e => {
          if (cb.current.onPick) cb.current.onPick({ lat: e.lngLat.lat, lng: e.lngLat.lng })
          else cb.current.onSelect?.(null)
        })
        map.current = m
        mo = new MutationObserver(restyle)
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
        mq = matchMedia('(prefers-color-scheme: dark)')
        mq.addEventListener('change', restyle)
      } catch { setFailed(true) }
    })()
    return () => {
      cancelled = true
      mo?.disconnect()
      mq?.removeEventListener('change', restyle)
      map.current?.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Marcadores dos locais.
  useEffect(() => {
    const m = map.current, ml = lib.current
    if (!m || !ml || !ready) return
    markers.current.forEach(x => x.remove())
    markers.current = places.map(p => {
      const el = markerEl((p.source === 'comunidade' ? 'community' : 'mine') + (p.id === selected ? ' on' : ''), p.name)
      el.addEventListener('click', ev => { ev.stopPropagation(); cb.current.onSelect?.(p.id) })
      return new ml.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(m)
    })
    if (!fitted.current && !user && !pick && places.length) {
      fitted.current = true
      if (places.length === 1) m.jumpTo({ center: [places[0].lng, places[0].lat], zoom: 14 })
      else {
        const b = new ml.LngLatBounds()
        places.forEach(p => b.extend([p.lng, p.lat]))
        m.fitBounds(b, { padding: 50, maxZoom: 15, duration: 0 })
      }
    }
  }, [places, selected, ready, user, pick])

  // Centrar no local escolhido.
  useEffect(() => {
    const p = places.find(x => x.id === selected)
    if (p && map.current && ready) map.current.easeTo({ center: [p.lng, p.lat], zoom: Math.max(map.current.getZoom(), 14), duration: 500 })
  }, [selected, ready, places])

  // A minha posição (ponto a pulsar).
  useEffect(() => {
    const m = map.current, ml = lib.current
    if (!m || !ml || !ready) return
    userMarker.current?.remove()
    userMarker.current = null
    if (user) {
      userMarker.current = new ml.Marker({ element: markerEl('me', tr('A tua posição')) }).setLngLat([user.lng, user.lat]).addTo(m)
      if (!pick) m.flyTo({ center: [user.lng, user.lat], zoom: Math.max(m.getZoom(), 14), duration: 800 })
    }
  }, [user, ready, pick])

  // Ponto escolhido no formulário.
  useEffect(() => {
    const m = map.current, ml = lib.current
    if (!m || !ml || !ready) return
    pickMarker.current?.remove()
    pickMarker.current = null
    if (pick) {
      pickMarker.current = new ml.Marker({ element: markerEl('mine on'), anchor: 'bottom' }).setLngLat([pick.lng, pick.lat]).addTo(m)
      if (m.getZoom() < 13 || !m.getBounds().contains([pick.lng, pick.lat])) m.easeTo({ center: [pick.lng, pick.lat], zoom: Math.max(m.getZoom(), 15), duration: 600 })
    }
  }, [pick, ready])

  return (
    <div className="safe-map" style={{ height }}>
      <div ref={box} className="safe-map-canvas" />
      {!ready && !failed && <div className="safe-map-msg small muted">{tr('A carregar o mapa…')}</div>}
      {failed && <div className="safe-map-msg small">{tr('Não foi possível carregar o mapa. Verifica a ligação à internet. A lista continua disponível.')}</div>}
    </div>
  )
}
