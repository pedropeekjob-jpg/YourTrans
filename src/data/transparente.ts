// Entidades Queer Inclusivas (EQI) certificadas pela plataforma TransParente.
// Mostradas no mapa com autorização da TransParente (dada ao Pedro a 13/11/2026),
// citando sempre a TransParente como fonte, com ligação para https://transparente.com.pt/eqi/,
// sempre com o nome e o selo deles e uma ligação para a página da entidade.
// Para atualizar: substituir a lista e a data. Coordenadas opcionais (sem elas, só aparece na lista).
import type { Facilities } from '../lib/types'

export const TRANSPARENTE_UPDATED = ''

export interface TransparenteEntity {
  name: string
  /** Um dos tipos do mapa (src/data/seal.ts, entityKinds). */
  kind: string
  district: string
  address?: string
  /** Página da entidade na TransParente ou o site da entidade. */
  url?: string
  facilities?: Facilities
  lat?: number
  lng?: number
}

export const transparenteEntities: TransparenteEntity[] = []
