import { countryPack, type CountryPack } from '../data/countries'
import { useVault } from './vault-context'

/** Pacote do país escolhido pela pessoa (Portugal por omissão). */
export function useCountry(): CountryPack {
  return countryPack(useVault().vault.settings.country)
}
