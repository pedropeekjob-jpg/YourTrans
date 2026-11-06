// Estilo de mapa próprio sobre os dados abertos do OpenStreetMap (esquema OpenMapTiles),
// servidos gratuitamente pelo OpenFreeMap. As cores vêm das variáveis CSS do tema,
// por isso o mapa acompanha o tema escuro néon e o tema claro.
import type { StyleSpecification } from 'maplibre-gl'

export const TILES_URL = 'https://tiles.openfreemap.org/planet'
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'

export interface MapPalette {
  dark: boolean
  bg: string; land: string; water: string; park: string; building: string
  minor: string; major: string; highway: string; glowMajor: string; glowHighway: string
  label: string; halo: string; boundary: string
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** O tema atual: data-theme no <html>, ou o do telemóvel quando não há atributo. */
export function isDarkTheme(): boolean {
  const t = document.documentElement.dataset.theme
  if (t === 'dark') return true
  if (t === 'light') return false
  return matchMedia('(prefers-color-scheme: dark)').matches
}

export function paletteFromTheme(): MapPalette {
  const dark = isDarkTheme()
  const accent = cssVar('--accent', dark ? '#7cc8f0' : '#2a78ad')
  const rose = cssVar('--rose', '#e0789a')
  const text = cssVar('--text', dark ? '#f1eff8' : '#1f1d2b')
  const bg = cssVar('--bg', dark ? '#14131b' : '#f7f5f1')
  if (dark) {
    return {
      dark, bg: '#07060d', land: '#0c0b15', water: '#0a1a2b', park: '#0d1f1a', building: '#161427',
      minor: '#25233a', major: cssVar('--sky', '#5bcefa'), highway: cssVar('--flag-pink', '#f5a9b8'),
      glowMajor: accent, glowHighway: rose, label: text, halo: '#07060d', boundary: '#4a3d66',
    }
  }
  return {
    dark, bg, land: '#efebe4', water: '#bfe6fa', park: '#d5efdf', building: '#e4dfd5',
    minor: '#ffffff', major: '#ffffff', highway: '#f7b9c6',
    glowMajor: '#8fd3f5', glowHighway: '#ee8faa', label: text, halo: '#ffffff', boundary: '#c7b8d8',
  }
}

const MINOR = ['minor', 'service', 'track', 'path']
const MAJOR = ['primary', 'secondary', 'tertiary', 'trunk']
const HIGHWAY = ['motorway']
const w = (z: number[]): unknown => ['interpolate', ['exponential', 1.5], ['zoom'], ...z]
const lin = (z: number[]): unknown => ['interpolate', ['linear'], ['zoom'], ...z]

export function buildStyle(p: MapPalette): StyleSpecification {
  const roadFilter = (classes: string[]) => ['all', ['in', ['get', 'class'], ['literal', classes]], ['!=', ['get', 'brunnel'], 'tunnel']]
  const layers: unknown[] = [
    { id: 'bg', type: 'background', paint: { 'background-color': p.land } },
    { id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'farmland']]], paint: { 'fill-color': p.park, 'fill-opacity': 0.55 } },
    { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': p.park } },
    { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': p.water } },
    { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': p.water, 'line-width': w([10, 0.5, 18, 6]) } },
    { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': p.building, 'fill-opacity': p.dark ? 0.9 : 0.8 } },
    { id: 'boundary', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['<=', ['get', 'admin_level'], 4], paint: { 'line-color': p.boundary, 'line-width': 1, 'line-dasharray': [3, 2] } },
    // Estradas: brilho desfocado por baixo e linha nítida por cima (efeito néon).
    ...(p.dark ? [] : [{ id: 'road-minor-case', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: roadFilter(MINOR), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ddd6ca', 'line-width': w([12, 1.5, 18, 13]) } }]),
    { id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: roadFilter(MINOR), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.minor, 'line-width': w([12, 0.5, 18, 10]) } },
    { id: 'road-major-glow', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: roadFilter(MAJOR), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.glowMajor, 'line-width': lin([6, 3, 12, 12, 16, 24, 18, 40]), 'line-blur': lin([6, 2, 12, 8, 16, 16, 18, 26]), 'line-opacity': p.dark ? 0.75 : 0.9 } },
    { id: 'road-major', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: roadFilter(MAJOR), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.major, 'line-width': w([6, 0.4, 18, 12]), 'line-opacity': p.dark ? 0.85 : 1 } },
    { id: 'road-highway-glow', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: roadFilter(HIGHWAY), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.glowHighway, 'line-width': lin([5, 4, 12, 14, 16, 28, 18, 44]), 'line-blur': lin([5, 3, 12, 9, 16, 18, 18, 28]), 'line-opacity': p.dark ? 0.8 : 0.9 } },
    { id: 'road-highway', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: roadFilter(HIGHWAY), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.highway, 'line-width': w([5, 0.8, 18, 14]) } },
    { id: 'road-label', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 14, layout: { 'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'name:pt'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 11 }, paint: { 'text-color': p.label, 'text-halo-color': p.halo, 'text-halo-width': 1.4, 'text-opacity': 0.75 } },
    { id: 'place-label', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'suburb', 'neighbourhood']]], layout: { 'text-field': ['coalesce', ['get', 'name:pt'], ['get', 'name']], 'text-font': ['Noto Sans Bold'], 'text-size': ['match', ['get', 'class'], 'city', 15, 'town', 13, 11], 'text-letter-spacing': 0.04 }, paint: { 'text-color': p.label, 'text-halo-color': p.halo, 'text-halo-width': 1.6 } },
  ]
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: { omt: { type: 'vector', url: TILES_URL, attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contribuidores do OpenStreetMap</a>' } },
    layers,
  } as StyleSpecification
}
