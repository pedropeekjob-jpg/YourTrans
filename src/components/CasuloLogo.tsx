/** Símbolo do Casulo (A·2.1): a cabeça encosta-se ao braço azul. A cabeça usa a cor do texto,
 *  por isso funciona no tema claro e no escuro. */
export function CasuloLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <mask id="casulo-mg" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff" /><circle cx="37" cy="36" r="18" fill="#000" /></mask>
      <path d="M24 30C6 46 14 82 62 82" mask="url(#casulo-mg)" fill="none" stroke="#2a78ad" strokeWidth="11" strokeLinecap="round" />
      <path d="M62 18C92 28 92 76 40 84" fill="none" stroke="#e0789a" strokeWidth="11" strokeLinecap="round" />
      <circle cx="37" cy="36" r="13" fill="currentColor" />
    </svg>
  )
}
