// Gerado por scripts/transparente.mjs a partir de https://transparente.com.pt/eqi/ — não editar à mão.
// Entidades Queer Inclusivas (EQI) da plataforma TransParente, mostradas com autorização
// (dada ao Pedro a 13/11/2026), citando sempre a TransParente como fonte, com ligação.
import type { Facilities } from '../lib/types'

export const TRANSPARENTE_UPDATED = '2026-11-13'

export interface TransparenteEntity {
  name: string
  /** Um dos tipos do mapa (src/data/seal.ts, entityKinds). */
  kind: string
  district: string
  address?: string
  /** Também atende à distância. */
  remote?: boolean
  /** Página da entidade na TransParente. */
  url: string
  /** Tem o selo TransParente (as outras são da rede EQI por confiança, sem selo). */
  seal: boolean
  /** Nível EQI: 1 iniciante, 2 confiante, 3 excelente. */
  level?: 1 | 2 | 3
  facilities?: Facilities
  lat?: number
  lng?: number
}

export const transparenteEntities: TransparenteEntity[] = [
  {
    name: "Acesso Cultura",
    kind: "Associação",
    district: "Lisboa",
    url: "https://transparente.com.pt/entidade-inclusiva/acesso-cultura/",
    seal: false,
    level: 1
  },
  {
    name: "Affirmative Q Psicologia Clinica",
    kind: "Saúde",
    district: "Online",
    remote: true,
    url: "https://transparente.com.pt/entidade-inclusiva/affirmative-q-psicologia-clinica/",
    seal: false,
    level: 2
  },
  {
    name: "ÁGORA Porto",
    kind: "Cultura",
    district: "Porto",
    url: "https://transparente.com.pt/entidade-inclusiva/agora-porto/",
    seal: false,
    level: 2
  },
  {
    name: "AMPLOS",
    kind: "Associação",
    district: "Lisboa",
    url: "https://transparente.com.pt/entidade-inclusiva/amplos/",
    seal: false
  },
  {
    name: "Leandro Treinarte – Personal Trainer",
    kind: "Outro",
    district: "Online",
    remote: true,
    url: "https://transparente.com.pt/entidade-inclusiva/leandro-treinarte-personal-trainer/",
    seal: true,
    level: 3
  },
  {
    name: "LGBTI Viseu",
    kind: "Associação",
    district: "Viseu",
    url: "https://transparente.com.pt/entidade-inclusiva/lgbti-viseu/",
    seal: false,
    level: 2
  },
  {
    name: "MUSSOC",
    kind: "Associação",
    district: "Lisboa",
    url: "https://transparente.com.pt/entidade-inclusiva/mussoc/",
    seal: false,
    level: 1
  },
  {
    name: "Nucleo AMPLOS do Baixo-Alentejo",
    kind: "Associação",
    district: "Beja",
    url: "https://transparente.com.pt/entidade-inclusiva/nucleo-amplos-do-baixo-alentejo/",
    seal: false
  },
  {
    name: "Opus Diversidades",
    kind: "Associação",
    district: "Lisboa",
    url: "https://transparente.com.pt/entidade-inclusiva/opus-diversidades/",
    seal: true,
    level: 2,
    address: "Rua da Ilha Terceira, 34, 2.º, 1000-173 Lisboa",
    lat: 38.7335,
    lng: -9.1392
  },
  {
    name: "Rita Andrade, Psicóloga e Educadora Menstrual",
    kind: "Saúde",
    district: "Online",
    remote: true,
    url: "https://transparente.com.pt/entidade-inclusiva/rita-andrade-psicologa/",
    seal: true,
    level: 2
  },
  {
    name: "Sheila Habib, Educadora Menstrual",
    kind: "Saúde",
    district: "Lisboa",
    remote: true,
    url: "https://transparente.com.pt/entidade-inclusiva/sheila-habib-educadora-menstrual/",
    seal: true,
    level: 2
  },
  {
    name: "Taiane Mendes – Estética LGBTQIA",
    kind: "Saúde",
    district: "Lisboa",
    url: "https://transparente.com.pt/entidade-inclusiva/estetica-lgbtqia/",
    seal: true,
    level: 1
  }
]
