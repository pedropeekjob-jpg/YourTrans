// Interruptores de partes da app que estão desligadas por agora (o código fica, para as reativar).
/**
 * Pacotes pagos para entidades (preços, pedidos de adesão, painel, serviços pagos e sessões solidárias).
 * Desligados a 20 nov 2026: o Casulo ainda não tem entidade fiscal para passar faturas.
 * Com false, as páginas /entidades, /entidades/painel, /transparencia e /servicos não existem
 * e nenhuma ligação aponta para elas. O código fica todo: para reativar, basta pôr true.
 * O Selo Casulo (registo grátis e avaliações) continua ligado.
 */
export const PARTNER_PLANS_ON = false
