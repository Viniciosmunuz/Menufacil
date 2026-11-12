import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";

import { LEGENDAS } from "./legendas";
import { FONTE, seg } from "./marca";
import {
  Chip,
  Codigo,
  Entra,
  Forte,
  Fundo,
  Icone,
  Legenda,
  Lia,
  Medida,
  Mono,
  No,
  Passo,
  Rotulo,
  Sub,
  T,
  Titulo,
} from "./tecnico-pecas";

/**
 * O vídeo técnico do Menu Fácil, para o LinkedIn.
 *
 * **Quadrado, nas cores do sistema, com legenda.** O quadrado é o
 * formato que o feed do LinkedIn não corta em nenhum dos dois lados e
 * que ainda ocupa bastante tela no celular. As cores são as do produto,
 * tiradas de globals.css: quem assiste e depois abre o sistema vê a
 * mesma coisa.
 *
 * A legenda existe porque metade daquele feed assiste sem som. O resto
 * da tela fala com quem ouve; a faixa de baixo fala com quem está numa
 * reunião. Como ela cobre os 210px finais, nada que importe desce até
 * lá -- e o que a voz diz não é repetido no meio da tela, senão a mesma
 * frase apareceria duas vezes de uma vez só.
 *
 * **Tudo que aparece é código que está rodando.** Os trechos foram
 * copiados do repositório, não escritos para o vídeo: num post técnico,
 * um número redondo ou um exemplo inventado é o que o leitor desconfia
 * primeiro.
 *
 * **Os tempos saem da narração.** Foram medidos no MP3 já editado,
 * bloco a bloco. A edição do áudio foi só tirar silêncio: a fala não foi
 * acelerada nem cortada em lugar nenhum -- dos 71,4s do arquivo
 * original, 59,6s são voz, e esse é o piso do vídeo.
 */

export const DURACAO_LINKEDIN = 67.6;

const CENA = {
  gancho: [0, 6.72],
  numeros: [6.72, 16.47],
  problema: [16.47, 25.17],
  caminho: [25.17, 34.55],
  preco: [34.55, 46.59],
  validacao: [46.59, 54.99],
  pix: [54.99, 60.15],
  fecho: [60.15, 67.6],
} as const;

/**
 * A moldura: o conteúdo vive acima da faixa de legenda.
 *
 * Ancorado embaixo, e não centrado, para encostar logo acima da legenda.
 * Centrado, cada cena flutuava no meio com um vão morto entre ela e a
 * faixa.
 */
const Tela: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 26 }) => (
  <AbsoluteFill style={{ padding: "70px 68px 250px", gap, justifyContent: "flex-end" }}>
    {children}
  </AbsoluteFill>
);

// ─── 1. o gancho ──────────────────────────────────────────────────────
// "Como estou construindo um sistema de delivery do zero. / Menu Fácil: /
//  a engenharia por trás de um produto real."

const Gancho: React.FC = () => (
  <Tela gap={34}>
    <Entra atrasa={0.05}>
      <Titulo tamanho={78}>
        Como estou
        <br />
        construindo um sistema
        <br />
        de delivery <Forte>do zero</Forte>?
      </Titulo>
    </Entra>
    {/* O nome entra na deixa: ele só diz "Menu Fácil" aos 3,3s. */}
    <Entra atrasa={3.25}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 8 }}>
        <Icone tamanho={132} atrasa={3.25} />
        <div>
          <Titulo tamanho={58}>Menu Fácil</Titulo>
          <Sub tamanho={34} cor={T.brandTexto}>
            engenharia por trás de um produto real
          </Sub>
        </div>
      </div>
    </Entra>
  </Tela>
);

// ─── 2. os números ────────────────────────────────────────────────────
// "Hoje são 159 mil linhas de TypeScript, / 45 modelos no Postgres, /
//  60 migrations aplicadas e 20 rotas de API."

const Numeros: React.FC = () => (
  <Tela gap={34}>
    <Entra>
      <Rotulo>hoje, em produção</Rotulo>
    </Entra>
    {/* Cada número entra quando ele o diz, não todos de uma vez. Em duas
        colunas porque no quadrado a coluna única não caberia. */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px 26px" }}>
      <Medida valor="159 mil" oque="linhas de TypeScript" atrasa={0.2} />
      <Medida valor="45" oque="modelos no PostgreSQL" atrasa={3.7} />
      <Medida valor="60" oque="migrations aplicadas" atrasa={5.9} />
      <Medida valor="20" oque="rotas de API" atrasa={7.3} />
    </div>
  </Tela>
);

// ─── 3. o problema ────────────────────────────────────────────────────
// "O pedido chega no WhatsApp como texto livre. / Precisa virar um
//  registro válido: / produto, opção, taxa de entrega, total em centavos."

/** A mensagem crua, nas cores da bolha do WhatsApp. */
const Mensagem: React.FC = () => (
  <div
    style={{
      background: "#D9FDD3",
      border: "1px solid #bfe9b6",
      borderRadius: "20px 20px 20px 6px",
      padding: "26px 30px",
      fontFamily: FONTE,
      fontSize: 38,
      lineHeight: 1.38,
      color: "#111b21",
    }}
  >
    oi, queria 2 x-burger sem cebola e uma coca 2l, rua das flores 120 no centro,
    pago no pix
  </div>
);

const Problema: React.FC = () => (
  <Tela gap={28}>
    <Entra>
      <Rotulo>o problema</Rotulo>
    </Entra>
    <Entra atrasa={0.2}>
      <Mensagem />
    </Entra>
    {/* Os campos entram quando ele os lista, um por um. */}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {[
        "produto por código",
        "opção por grupo",
        "taxa por bairro",
        "total em centavos",
        "estoque",
        "horário",
      ].map((s, i) => (
        <Chip key={s} atrasa={4.9 + i * 0.22}>
          {s}
        </Chip>
      ))}
    </div>
  </Tela>
);

// ─── 4. o caminho ─────────────────────────────────────────────────────
// "A mensagem entra por um webhook, / passa pelo Claude com cinco
//  ferramentas, / e vira pedido gravado no banco. / O balcão acende e a
//  comanda sai na impressora."

const Caminho: React.FC = () => (
  <Tela gap={22}>
    <Entra>
      <Rotulo>o caminho de um pedido</Rotulo>
    </Entra>
    {/* A Lia ao lado do passo que é dela: é o único lugar do vídeo em que
        o diagrama fala da atendente, e o rosto fixa quem ela é mais
        rápido que o nome da função. */}
    <Entra atrasa={2.1}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Lia tamanho={92} atrasa={2.1} />
        <div>
          <Sub tamanho={34} cor={T.tinta}>
            Lia, a atendente
          </Sub>
          <Sub tamanho={28} cor={T.tinta3}>
            Claude com 5 ferramentas
          </Sub>
        </div>
      </div>
    </Entra>
    <div>
      <No titulo="POST /api/zapi/webhook" nota="a mensagem entra, assinada" atrasa={0.1} />
      <No titulo="responder()" nota="o modelo escolhe a ferramenta" atrasa={2.2} destaque />
      <No titulo="placeOrder()" nota="valida, calcula e grava no Postgres" atrasa={4.5} destaque />
      <No titulo="SSE + impressora" nota="o balcão acende e a comanda sai" atrasa={6.5} ultimo />
    </div>
  </Tela>
);

// ─── 5. a decisão ─────────────────────────────────────────────────────
// "E aqui está a decisão mais importante do projeto: / o modelo não
//  define preço. / Quem calcula o total é o servidor, contra o banco,
//  aplicando as regras de negócio. / A IA só confirma."

const Preco: React.FC = () => (
  <Tela gap={26}>
    <Entra>
      <Rotulo>a decisão que importa</Rotulo>
    </Entra>
    {/* A frase entra no segundo exato em que ele a diz. É a tese do vídeo
        inteiro, e a única que aparece em corpo grande. */}
    <Entra atrasa={3.1}>
      <Titulo tamanho={66}>
        O modelo <Forte>não define preço</Forte>.
      </Titulo>
    </Entra>
    <Codigo
      arquivo="src/server/ia/pedido.ts"
      atrasa={5.4}
      tamanho={29}
      acende={[2, 3, 4, 5]}
      acendeEm={6.4}
      linhas={[
        `name: "criar_pedido",`,
        `input_schema: {`,
        `  type: "object",`,
        `  properties: {},`,
        `},`,
      ]}
    />
    {/* Em chips, e não na frase inteira: a frase inteira já está sendo
        falada e já aparece na legenda do rodapé. Os chips acrescentam,
        porque separam as três garantias que a fala diz de corrido. */}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {["total calculado no servidor", "conferido contra o banco", "regras de negócio"].map(
        (s, i) => (
          <Chip key={s} atrasa={5.8 + i * 0.5}>
            {s}
          </Chip>
        ),
      )}
    </div>
  </Tela>
);

// ─── 6. validação ─────────────────────────────────────────────────────
// "Toda entrada é validada antes de encostar no banco. / E dois sim
//  seguidos não viram dois pedidos: / quem apaga o rascunho é quem grava."

const Validacao: React.FC = () => (
  <Tela gap={26}>
    <Entra>
      <Rotulo>validação e concorrência</Rotulo>
    </Entra>
    {/* Só o nome da lib: que a entrada é validada ele já diz, e a legenda
        já escreve. Qual lib faz isso, não. */}
    <Entra atrasa={0.2}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Mono cor={T.brandTexto}>zod</Mono>
        <Sub tamanho={34} cor={T.tinta2}>
          em toda entrada
        </Sub>
      </div>
    </Entra>
    <Codigo
      arquivo="src/server/ia/pedido.ts"
      atrasa={3.3}
      tamanho={28}
      acende={[2, 3, 4, 5, 6]}
      acendeEm={6.0}
      linhas={[
        `// quem apagou o rascunho é quem cria`,
        `const { count } = await db.iaRascunho`,
        `  .deleteMany({ where: {`,
        `    id: rascunho.id,`,
        `    createdAt: rascunho.createdAt,`,
        `  } });`,
        ``,
        `if (count === 0) return erro(...);`,
      ]}
    />
  </Tela>
);

// ─── 7. o Pix ─────────────────────────────────────────────────────────
// "Pagamento no Pix, com a cobrança gerada na hora e o cliente avisado
//  quando o dinheiro cai."

const Pix: React.FC = () => (
  <Tela gap={26}>
    <Entra>
      <Rotulo>pagamento</Rotulo>
    </Entra>
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Passo numero="01" texto="Cobrança Pix gerada no fechamento" atrasa={0.3} />
      <Passo numero="02" texto="Webhook do provedor confirma" atrasa={1.5} />
      <Passo numero="03" texto="Cliente avisado no WhatsApp" atrasa={2.9} pronto />
    </div>
  </Tela>
);

// ─── 8. o fecho ───────────────────────────────────────────────────────
// "Menu Fácil. / Mais do que um cardápio digital: / um produto de
//  tecnologia em constante evolução."

const Fecho: React.FC = () => (
  <Tela gap={24}>
    <Entra atrasa={0.1}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <Icone tamanho={160} atrasa={0.1} />
        <Titulo tamanho={64}>Menu Fácil</Titulo>
        <Sub tamanho={34} cor={T.brandTexto}>
          menufacildelivery.com.br
        </Sub>
      </div>
    </Entra>
    <Entra atrasa={1.2}>
      <div style={{ height: 1, background: T.borda, margin: "6px 50px" }} />
    </Entra>
    <Entra atrasa={1.4}>
      <div style={{ textAlign: "center" }}>
        <Sub tamanho={38} cor={T.tinta}>
          Mais do que um cardápio digital:
          <br />
          <Forte>um produto de tecnologia</Forte> em constante evolução.
        </Sub>
      </div>
    </Entra>
  </Tela>
);

// ─── a montagem ───────────────────────────────────────────────────────

const CENAS = [
  [CENA.gancho, Gancho],
  [CENA.numeros, Numeros],
  [CENA.problema, Problema],
  [CENA.caminho, Caminho],
  [CENA.preco, Preco],
  [CENA.validacao, Validacao],
  [CENA.pix, Pix],
  [CENA.fecho, Fecho],
] as const;

export const TecnicoLinkedIn: React.FC = () => (
  <AbsoluteFill style={{ background: T.fundo }}>
    <Fundo />
    <Audio src={staticFile("narracao-tecnico-v2-edit.mp3")} />
    {CENAS.map(([[de, ate], Cena], i) => (
      <Sequence key={i} from={seg(de)} durationInFrames={seg(ate - de)}>
        <Cena />
      </Sequence>
    ))}
    {/* A legenda para antes do fecho: ali a frase de encerramento já
        está grande no meio da tela, e vê-la escrita duas vezes ao mesmo
        tempo -- no cartão e na faixa -- fica confuso. Quem assiste sem
        som não perde nada: é o único trecho em que a tela diz,
        literalmente, o que a voz está dizendo. */}
    <Legenda falas={LEGENDAS.filter(([de]) => de < CENA.fecho[0])} />
  </AbsoluteFill>
);
