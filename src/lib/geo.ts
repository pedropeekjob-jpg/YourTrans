// Geografia feita no próprio telemóvel: a posição da pessoa nunca sai do aparelho.
// Só o servidor de mapas (OpenFreeMap) vê que zona do mapa está a ser vista,
// tal como acontece com qualquer mapa, mas nunca a posição exata do GPS.

export interface LatLng { lat: number; lng: number }

/** Distância em metros (fórmula de haversine). */
export function distance(a: LatLng, b: LatLng): number {
  const R = 6371e3
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`
  if (m < 10000) return `${(m / 1000).toFixed(1).replace('.', ',')} km`
  return `${Math.round(m / 1000)} km`
}

/** Arredonda a ~11 m: chega para encontrar um local e não guarda mais precisão do que a precisa. */
export const round4 = (n: number) => Math.round(n * 1e4) / 1e4

/** Portugal continental, Açores e Madeira (com folga). */
export function inPortugal(p: LatLng): boolean {
  return p.lat >= 29.5 && p.lat <= 42.5 && p.lng >= -31.8 && p.lng <= -6
}

export const PORTUGAL_CENTER: LatLng = { lat: 39.55, lng: -8.1 }

/** Pede a posição ao telemóvel uma única vez (sem seguimento contínuo). */
export function locateOnce(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('sem-gps'))
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  })
}

/** Link para a app de navegação que a pessoa já usa. Não passa pelo nosso servidor. */
export function directionsUrl(p: LatLng, name: string): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (/iPhone|iPad|iPod|Macintosh/.test(ua) && 'ontouchend' in globalThis) return `https://maps.apple.com/?daddr=${p.lat},${p.lng}`
  if (/Android/.test(ua)) return `geo:${p.lat},${p.lng}?q=${p.lat},${p.lng}(${encodeURIComponent(name)})`
  return `https://www.openstreetmap.org/directions?route=%3B${p.lat}%2C${p.lng}#map=16/${p.lat}/${p.lng}`
}

export const wazeUrl = (p: LatLng) => `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`
