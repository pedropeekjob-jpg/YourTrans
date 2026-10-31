export type Theme = 'system' | 'light' | 'dark'
export type PanicTarget = 'calculator' | 'weather'

export interface Settings {
  displayName: string
  pronouns: string
  theme: Theme
  panicTarget: PanicTarget
  autoLockMinutes: number
  discreetNotifications: boolean
  country: 'PT' | 'BR'
  onboarded: boolean
  birthYear?: number
  organs: ('colo' | 'mama' | 'prostata')[]
  interests: string[]
}

export interface Reminder {
  id: string
  kind: 'hormona' | 'analises' | 'consulta' | 'outro'
  label: string
  /** ISO da próxima ocorrência */
  next: string
  /** Repetição em dias (0 = única) */
  everyDays: number
  notes?: string
}

export interface DoseLog { id: string; reminderId: string; at: string }

export interface JournalEntry {
  id: string
  date: string
  text: string
  mood?: number
  photoIds: string[]
  /** Momento de euforia de género */
  euphoria?: boolean
}

export interface EffectLog {
  id: string
  date: string
  /** Escala 0-5 por efeito */
  values: Record<string, number>
  notes?: string
}

export interface Appointment {
  id: string
  date: string
  with: string
  questions: { id: string; text: string; done: boolean }[]
  notes?: string
}

export interface TrustedContact { id: string; name: string; phone: string }

export type ShowerType = 'individuais' | 'comuns' | 'ambos' | 'sem'

/** Informação sobre balneários e casas de banho de um local. */
export interface Facilities {
  wcNeutro?: boolean
  cabinesIndividuais?: boolean
  duches?: ShowerType
  vestiarioNeutro?: boolean
}

export interface Place {
  id: string
  name: string
  kind: string
  district: string
  notes?: string
  facilities: Facilities
  source?: 'meu' | 'comunidade'
}

export interface SavedPlace extends Place {}

export interface SavedEvent { id: string; title: string; date: string; place?: string; url?: string }

export interface Vault {
  version: 1
  settings: Settings
  checklist: Record<string, boolean>
  guideSteps: Record<string, boolean>
  letterFields: Record<string, string>
  reminders: Reminder[]
  doseLog: DoseLog[]
  journal: JournalEntry[]
  effects: EffectLog[]
  appointments: Appointment[]
  contacts: TrustedContact[]
  places: SavedPlace[]
  favourites: string[]
  /** Nomes em ensaio */
  names: { id: string; name: string; pronouns: string; liked?: boolean }[]
  /** Dias com check-in feito (YYYY-MM-DD) */
  checkins: string[]
  events: SavedEvent[]
  /** Testemunhos a que já deste apoio */
  supported: string[]
}

export function emptyVault(): Vault {
  return {
    version: 1,
    settings: {
      displayName: '',
      pronouns: '',
      theme: 'system',
      panicTarget: 'calculator',
      autoLockMinutes: 5,
      discreetNotifications: true,
      country: 'PT',
      onboarded: false,
      organs: [],
      interests: [],
    },
    checklist: {},
    guideSteps: {},
    letterFields: {},
    reminders: [],
    doseLog: [],
    journal: [],
    effects: [],
    appointments: [],
    contacts: [],
    places: [],
    favourites: [],
    names: [],
    checkins: [],
    events: [],
    supported: [],
  }
}

export function uid(): string {
  return crypto.randomUUID()
}

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}
