import { Link } from 'react-router-dom'
import { TopBar } from '../components/Layout'
import { tr } from '../i18n'

/** Política de privacidade. Atualizar a data sempre que o texto mudar. */
export const PRIVACY_UPDATED = '2026-11-06'
export const PRIVACY_CONTACT = 'privacidade@casulo.space'

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
          <p className="small">{tr('O que registas para ti fica só no teu aparelho, cifrado, e nós não lhe temos acesso. Só sai do aparelho o que escolhes partilhar com a comunidade: vai sem nome, sem conta e sem endereço IP guardado, e só é publicado depois de uma pessoa da moderação o aprovar.')}</p>
          <p className="xs muted">{tr('Última atualização: {0}', PRIVACY_UPDATED)}</p>
        </section>

        <Section title={tr('1. O que fica só no teu aparelho')} items={[
          tr('Diário, fotos, humor, lembretes, documentos, percurso, contactos de confiança, locais guardados e todas as definições.'),
          tr('Fica cifrado (AES-256) no browser deste aparelho. Não há conta, servidor nem cópia nossa: não conseguimos ver, recuperar nem entregar estes dados a ninguém.'),
          tr('Cópias de segurança e passagens por QR são feitas por ti, cifradas com uma palavra-passe ou código teu, e não passam pelos nossos servidores.'),
        ]} />

        <Section title={tr('2. O que partilhas com a comunidade')} items={[
          tr('Só quando o escolhes: locais seguros, testemunhos, perguntas e respostas, eventos, avaliações de profissionais e de empregadores, relatos de discriminação e pedidos de mentoria.'),
          tr('Guardamos apenas o texto e as opções do formulário e o mês do envio. Não pedimos nome, e-mail nem conta. A alcunha é opcional.'),
          tr('A localização de um local seguro é arredondada (cerca de 10 metros) e só é aceite dentro de Portugal.'),
          tr('Nada é publicado sem aprovação humana. O que é rejeitado é apagado de imediato.'),
          tr('Relatos de discriminação: a descrição só é vista pela moderação. Publicamos apenas números agregados, e só quando há 5 ou mais relatos, para ninguém ser identificado.'),
          tr('Pedidos de mentoria: o contacto que deixas só é visto pela moderação, para fazer a ligação, e é apagado ao fim de 6 meses.'),
          tr('Não escrevas no texto dados que te identifiquem a ti ou a outras pessoas. A moderação retira-os ou rejeita o envio.'),
        ]} />

        <Section title={tr('3. Onde ficam e quem os trata')} items={[
          tr('O servidor da comunidade está alojado no Render, num centro de dados em Frankfurt (União Europeia).'),
          tr('A nossa aplicação não guarda endereços IP. Para travar abusos, usamos durante 24 horas uma impressão irreversível do IP, só em memória. O Render pode registar ligações técnicas nos seus próprios registos.'),
          tr('A app é servida pelo GitHub Pages e o mapa usa o OpenFreeMap (dados OpenStreetMap). Ao abrir a app ou o mapa, o teu browser liga-se a estes serviços, que recebem o teu IP como em qualquer site.'),
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
  return <p className="xs muted">{tr('Vai sem nome nem IP e só aparece depois de moderado.')} <Link to="/privacidade">{tr('Como tratamos o que partilhas')}</Link></p>
}
