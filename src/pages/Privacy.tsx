import { Link } from 'react-router-dom'
import { TopBar } from '../components/Layout'
import { tr } from '../i18n'

/** Política de privacidade. Atualizar a data sempre que o texto mudar. */
export const PRIVACY_UPDATED = '2026-11-14'
export const PRIVACY_CONTACT = 'privacidade@casulo.space'
/** Responsável pelo tratamento (pessoa singular). */
export const PRIVACY_CONTROLLER = 'Pedro Oliveira'

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="card">
      <h3>{title}</h3>
      <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </section>
  )
}

export function Privacy() {
  return (
    <>
      <TopBar title={tr('Privacidade')} back />
      <div className="page">
        <section className="card tint-mint">
          <h3>{tr('Em resumo')}</h3>
          <p className="small">{tr('O que registas para ti fica só no teu aparelho, cifrado, e nós não lhe temos acesso. Só sai do aparelho o que escolhes partilhar com a comunidade: vai sem nome, sem conta e sem endereço IP guardado, e passa por um filtro automático antes de ser publicado. O que levanta dúvidas só aparece depois de uma pessoa da moderação o aprovar.')}</p>
          <p className="xs muted">{tr('Última atualização: {0}', PRIVACY_UPDATED)}</p>
        </section>

        <section className="card">
          <h3>{tr('Quem é responsável')}</h3>
          <p className="small">{tr('O Casulo é um projeto independente. O responsável pelo tratamento dos dados partilhados com a comunidade é {0}, a título pessoal. Contacto: {1}.', PRIVACY_CONTROLLER, PRIVACY_CONTACT)}</p>
        </section>

        <Section title={tr('1. O que fica só no teu aparelho')} items={[
          tr('Diário, fotos, humor, lembretes, documentos, percurso, contactos de confiança, locais guardados e todas as definições.'),
          tr('Fica cifrado (AES-256) no browser deste aparelho. Não há conta, servidor nem cópia nossa: não conseguimos ver, recuperar nem entregar estes dados a ninguém.'),
          tr('Cópias de segurança e passagens por QR são feitas por ti, cifradas com uma palavra-passe ou código teu, e não passam pelos nossos servidores.'),
        ]} />

        <Section title={tr('2. O que partilhas com a comunidade')} items={[
          tr('Só quando o escolhes: locais seguros, testemunhos, perguntas e respostas, eventos, avaliações de profissionais, de empregadores e de etapas do percurso de saúde, relatos de custos e tempos de espera, relatos de discriminação, pedidos de mentoria, registos de entidades para o Selo Casulo e avaliações dessas entidades.'),
          tr('Guardamos apenas o texto e as opções do formulário e o mês do envio. Não pedimos nome, e-mail nem conta. A alcunha é opcional.'),
          tr('A localização de um local seguro é arredondada (cerca de 10 metros) e só é aceite dentro de Portugal.'),
          tr('Cada envio passa por um filtro automático que corre só no nosso servidor, sem enviar o texto a outros serviços. O que está limpo é publicado; o que tiver insultos, ameaças, dados pessoais, publicidade ou sinais de crise fica à espera de uma pessoa da moderação. O que é rejeitado é apagado de imediato.'),
          tr('Profissionais de saúde, pedidos de mentoria e registos para o Selo Casulo são sempre vistos por uma pessoa antes de aparecerem. Qualquer pessoa pode denunciar o que está publicado, e o conteúdo sai do ar até ser revisto.'),
          tr('Relatos de custos e tempos de espera: guardamos só a parte do percurso, o setor, o ano e o valor, sem texto. Mostramos apenas intervalos (mínimo, mediana e máximo) e só quando há 3 ou mais relatos.'),
          tr('Relatos de discriminação: a descrição só é vista pela moderação. Publicamos apenas números agregados, e só quando há 5 ou mais relatos, para ninguém ser identificado.'),
          tr('Pedidos de mentoria: o contacto que deixas só é visto pela moderação, para fazer a ligação, e é apagado ao fim de 6 meses.'),
          tr('Registo para o Selo Casulo: o e-mail da entidade só é visto pela moderação, nunca é publicado, e é apagado quando o registo é rejeitado ou retirado.'),
          tr('Sugestões “Procurei e não encontrei”: guardamos o texto, a zona da app e o país escolhido. Só a equipa as lê, nunca são publicadas e são apagadas ao fim de 12 meses.'),
          tr('Não escrevas no texto dados que te identifiquem a ti ou a outras pessoas. A moderação retira-os ou rejeita o envio.'),
        ]} />

        <Section title={tr('3. Onde ficam e quem os trata')} items={[
          tr('O servidor da comunidade está alojado no Render, num centro de dados em Frankfurt (União Europeia).'),
          tr('A nossa aplicação não guarda endereços IP. Para travar abusos, usamos durante 24 horas uma impressão irreversível do IP, só em memória. O Render pode registar ligações técnicas nos seus próprios registos.'),
          tr('A app é servida pela Cloudflare e o mapa usa o OpenFreeMap (dados OpenStreetMap). Ao abrir a app ou o mapa, o teu aparelho liga-se a estes serviços, que recebem o teu IP como em qualquer site.'),
          tr('Na versão da App Store e do Google Play, a Apple e a Google tratam os dados da transferência da app segundo as suas próprias políticas. A app não tem estatísticas, publicidade nem rastreio, e os lembretes são agendados no próprio aparelho, sem passar por servidores.'),
          tr('Não usamos cookies de publicidade, estatísticas de visitas, pixels nem rastreadores. Não vendemos nem partilhamos dados.'),
        ]} />

        <Section title={tr('4. Porque tratamos estes dados')} items={[
          tr('O que partilhas pode revelar dados de saúde ou de identidade de género, que o RGPD protege de forma especial. Só os tratamos porque escolhes enviá-los, com o teu consentimento explícito (artigos 6.º, n.º 1, alínea a), e 9.º, n.º 2, alínea a), do RGPD).'),
          tr('Servem apenas para mostrar informação útil à comunidade e para estatísticas anónimas sobre discriminação.'),
        ]} />

        <Section title={tr('5. Os teus direitos')} items={[
          tr('Podes pedir para ver, corrigir ou apagar o que partilhaste, e retirar o consentimento a qualquer momento. Como não há conta, diz-nos qual foi o conteúdo (por exemplo, o título ou o nome do local) e apagamo-lo.'),
          tr('Os dados do teu aparelho apagas tu, em Definições › Apagar tudo.'),
          tr('Contacto: {0}. Respondemos no prazo de um mês.', PRIVACY_CONTACT),
          tr('Podes também apresentar queixa à Comissão Nacional de Proteção de Dados (www.cnpd.pt).'),
        ]} />

        <Section title={tr('6. Idade e alterações')} items={[
          tr('Para partilhar com a comunidade deves ter pelo menos 13 anos (idade de consentimento digital em Portugal).'),
          tr('Se esta política mudar, atualizamos a data acima e avisamos na app quando a mudança for importante.'),
        ]} />

        <p className="xs muted" style={{ textAlign: 'center' }}><Link to="/dados">{tr('Os teus dados')}</Link> · <Link to="/definicoes">{tr('Privacidade e definições')}</Link></p>
      </div>
    </>
  )
}

/** Linha curta para pôr junto dos formulários de partilha. */
export function ShareNote() {
  return <p className="xs muted">{tr('Vai sem nome nem IP e passa pela moderação antes de aparecer.')} <Link to="/privacidade">{tr('Como tratamos o que partilhas')}</Link></p>
}
