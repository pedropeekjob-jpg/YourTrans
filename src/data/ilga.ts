// Fontes da ILGA World para as leis de cada país (pedido do Pedro, 13 nov 2026).
// A app só tem ligações: não pede nada à ILGA, para que ninguém fique a saber o país de quem a usa.
// A revisão mensal (docs/revisao-mensal.md) usa estas páginas como primeira fonte.
// Endereços confirmados no sitemap de database.ilga.org a 13 nov 2026.

export const ILGA_DATABASE = 'https://database.ilga.org'
export const ILGA_GENDER_RECOGNITION = 'https://database.ilga.org/legal-gender-recognition'
export const ILGA_MAPS = 'https://ilga.org/ilga-world-maps/'

/** Nome de cada país no endereço da base de dados (database.ilga.org/<nome>-lgbti). */
const slugs: Record<string, string> = {
  PT: 'portugal', BR: 'brazil', ES: 'spain', FR: 'france', DE: 'germany',
  AG: 'antigua-and-barbuda', AR: 'argentina', BB: 'barbados', BO: 'bolivia', BS: 'bahamas',
  BZ: 'belize', CA: 'canada', CL: 'chile', CO: 'colombia', CR: 'costa-rica', CU: 'cuba',
  DM: 'dominica', DO: 'dominican-republic', EC: 'ecuador', GD: 'grenada', GT: 'guatemala',
  GY: 'guyana', HN: 'honduras', HT: 'haiti', JM: 'jamaica', KN: 'saint-kitts-and-nevis',
  LC: 'saint-lucia', MX: 'mexico', NI: 'nicaragua', PA: 'panama', PE: 'peru', PY: 'paraguay',
  SR: 'suriname', SV: 'el-salvador', TT: 'trinidad-and-tobago', US: 'united-states-of-america',
  UY: 'uruguay', VC: 'saint-vincent-and-the-grenadines', VE: 'venezuela',
}

/** Página do país na base de dados da ILGA World (ou a página inicial, se não houver). */
export function ilgaCountryUrl(code: string): string {
  const s = slugs[code]
  return s ? `${ILGA_DATABASE}/${s}-lgbti` : ILGA_DATABASE
}

export const hasIlgaPage = (code: string) => code in slugs
