import React from "react";
import { AbsoluteFill, Sequence } from "remotion";

import { FONTE, seg } from "./marca";
import {
  Destaque,
  Bolha,
  BotaoMarca,
  Entra,
  Fundo,
  Icone,
  Legenda,
  Lia,
  Marca,
  Nota,
  Passo,
  Quadro,
  T,
  Tela,
  Titulo,
} from "./tutorial-pecas";

/**
 * O vídeo no formato da referência que ele mandou: passo a passo de
 * fundo branco, para Instagram.
 *
 * **O assunto é o caminho do pedido, pelos dois lados.** Primeiro o
 * cliente que pede sozinho pelo link do cardápio; depois o que não quer
 * link nenhum e só manda mensagem. Os dois terminam no mesmo balcão,
 * com a mesma comanda saindo -- e esse encontro no fim é o argumento do
 * vídeo, não um detalhe de roteiro.
 *
 * **Nenhuma imagem gerada, nenhum print.** A referência desenha
 * interface com traço fino e caixa, e é assim aqui também: o que
 * aparece é desenho, não captura de tela. Sai mais limpo no feed e não
 * envelhece quando a tela do sistema mudar.
 */

export const DURACAO_TUTORIAL = 58;

const CENA = {
  abre: [0, 6],
  cardapio: [6, 14],
  pedido: [14, 22],
  conversa: [22, 31],
  anota: [31, 40],
  balcao: [40, 50],
  fecho: [50, 58],
} as const;

// ─── abertura ─────────────────────────────────────────────────────────

const Abre: React.FC = () => (
  <Tela gap={56}>
    <Entra>
      <div
        style={{
          fontFamily: FONTE,
          fontSize: 25,
          fontWeight: 700,
          letterSpacing: 2.6,
          color: T.tinta2,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        todo restaurante tá
      </div>
    </Entra>
    <Titulo preta="vendendo" azul="pelo WhatsApp." tamanho={92} atrasa={0.4} />
    <div style={{ marginTop: 20 }}>
      <Icone tamanho={190} atrasa={1.6} />
    </div>
    <div style={{ height: 24 }} />
    <Legenda atrasa={2.6}>
      e o pedido <Destaque>some</Destaque> no meio da conversa.
    </Legenda>
  </Tela>
);

// ─── 1. o cardápio ────────────────────────────────────────────────────

/** O celular desenhado, com o cardápio dentro. */
const Celular: React.FC<{ atrasa?: number; children: React.ReactNode }> = ({
  atrasa = 0,
  children,
}) => (
  <Quadro largura={420} atrasa={atrasa}>
    <div style={{ padding: "18px 20px", borderBottom: `2px solid ${T.tinta}`, textAlign: "center" }}>
      <div style={{ fontFamily: FONTE, fontSize: 22, color: T.tinta2 }}>
        menufacildelivery.com.br
      </div>
    </div>
    <div style={{ padding: "22px 20px" }}>{children}</div>
  </Quadro>
);

const ItemDoCardapio: React.FC<{ nome: string; preco: string; atrasa: number }> = ({
  nome,
  preco,
  atrasa,
}) => (
  <Entra atrasa={atrasa} sobeDe={10}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom: `1px solid ${T.linha}`,
        fontFamily: FONTE,
        fontSize: 28,
        color: T.tinta,
      }}
    >
      <span>{nome}</span>
      <span style={{ fontWeight: 700 }}>{preco}</span>
    </div>
  </Entra>
);

const Cardapio: React.FC = () => (
  <Tela gap={40}>
    <Passo numero={1} nome="o cardápio" />
    <Titulo preta="Um link." azul="Sem aplicativo." atrasa={0.3} />
    <Celular atrasa={1.2}>
      <ItemDoCardapio nome="X-Salada" preco="R$ 22,00" atrasa={1.8} />
      <ItemDoCardapio nome="X-Bacon" preco="R$ 26,00" atrasa={2.1} />
      <ItemDoCardapio nome="Refrigerante" preco="R$ 6,50" atrasa={2.4} />
    </Celular>
    <Nota atrasa={2.9}>Nada para instalar, nada para cadastrar.</Nota>
    <div style={{ height: 24 }} />
    <Legenda atrasa={3.4}>
      o cliente abre e <Destaque>já pede</Destaque>.
    </Legenda>
  </Tela>
);

// ─── 2. o pedido ──────────────────────────────────────────────────────

const Pedido: React.FC = () => (
  <Tela gap={40}>
    <Passo numero={2} nome="o pagamento" />
    <Titulo preta="Escolhe, monta," azul="e paga no Pix." atrasa={0.3} />
    <Quadro largura={460} atrasa={1.2}>
      <div style={{ padding: "24px 26px", fontFamily: FONTE }}>
        {[
          ["1x X-Salada", "R$ 22,00"],
          ["1x Refrigerante", "R$ 6,50"],
          ["Entrega", "R$ 3,00"],
        ].map(([o, v], i) => (
          <Entra key={o} atrasa={1.7 + i * 0.25} sobeDe={8}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 27,
                color: T.tinta2,
                padding: "6px 0",
              }}
            >
              <span>{o}</span>
              <span>{v}</span>
            </div>
          </Entra>
        ))}
        <Entra atrasa={2.6}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 32,
              fontWeight: 800,
              color: T.tinta,
              borderTop: `2px solid ${T.tinta}`,
              marginTop: 14,
              paddingTop: 14,
            }}
          >
            <span>Total</span>
            <span>R$ 31,50</span>
          </div>
        </Entra>
        <Entra atrasa={3.1}>
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <BotaoMarca>Pagar com Pix</BotaoMarca>
          </div>
        </Entra>
      </div>
    </Quadro>
    <div style={{ height: 24 }} />
    <Legenda atrasa={3.8}>
      o Pix cai e o pedido <Destaque>confirma sozinho</Destaque>.
    </Legenda>
  </Tela>
);

// ─── 3. a conversa ────────────────────────────────────────────────────

const Conversa: React.FC = () => (
  <Tela gap={36}>
    <Passo numero={3} nome="quem não quer link" />
    <Titulo preta="Não quer clicar?" azul="Só manda mensagem." atrasa={0.3} />
    <Entra atrasa={1.3}>
      <Lia tamanho={130} atrasa={1.3} />
    </Entra>
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 520 }}>
      <Bolha de="cliente" atrasa={2.0}>
        boa noite, vcs tão aberto?
      </Bolha>
      <Bolha de="lia" atrasa={2.6}>
        Estamos sim! 😊 Até 23h. Quer ver o cardápio ou já sabe o que vai querer?
      </Bolha>
      <Bolha de="cliente" atrasa={3.3}>
        quero 1 x-salada e uma coca
      </Bolha>
    </div>
    <div style={{ height: 24 }} />
    <Legenda atrasa={4.0}>
      a <Destaque>Lia</Destaque> atende, a qualquer hora.
    </Legenda>
  </Tela>
);

// ─── 4. ela anota ─────────────────────────────────────────────────────

const Anota: React.FC = () => (
  <Tela gap={36}>
    <Passo numero={4} nome="ela anota" />
    <Titulo preta="Ela monta o pedido" azul="e manda o Pix." atrasa={0.3} />
    <Quadro largura={500} atrasa={1.3}>
      <div style={{ padding: "24px 26px", fontFamily: FONTE, fontSize: 27, color: T.tinta }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Pedido de Vinicios</div>
        {["1x X-Salada — R$ 22,00", "1x Refrigerante — R$ 6,50", "Entrega — R$ 3,00"].map((l, i) => (
          <Entra key={l} atrasa={1.9 + i * 0.22} sobeDe={8}>
            <div style={{ color: T.tinta2, padding: "4px 0" }}>{l}</div>
          </Entra>
        ))}
        <Entra atrasa={2.8}>
          <div style={{ fontWeight: 800, marginTop: 12 }}>Total: R$ 31,50</div>
        </Entra>
        <Entra atrasa={3.2}>
          <div style={{ marginTop: 14, color: T.tinta2 }}>Posso confirmar o pedido?</div>
        </Entra>
      </div>
    </Quadro>
    <Entra atrasa={3.8}>
      <Bolha de="cliente">sim</Bolha>
    </Entra>
    <div style={{ height: 24 }} />
    <Legenda atrasa={4.4}>
      o preço vem do <Destaque>seu cardápio</Destaque>, não dela.
    </Legenda>
  </Tela>
);

// ─── 5. o balcão ──────────────────────────────────────────────────────

/** A linha do painel, com o pedido chegando. */
const NoPainel: React.FC<{ origem: string; atrasa: number }> = ({ origem, atrasa }) => (
  <Entra atrasa={atrasa} sobeDe={12}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        border: `2px solid ${T.tinta}`,
        borderRadius: 10,
        padding: "16px 20px",
        fontFamily: FONTE,
        fontSize: 27,
        color: T.tinta,
        background: T.papel,
      }}
    >
      <span style={{ fontWeight: 800 }}>#12</span>
      <span style={{ flex: 1 }}>Vinicios</span>
      <span
        style={{
          fontSize: 22,
          color: T.marca,
          border: `1px solid ${T.marcaClara}`,
          borderRadius: 999,
          padding: "4px 12px",
          whiteSpace: "nowrap",
        }}
      >
        {origem}
      </span>
      <span style={{ fontWeight: 800 }}>R$ 31,50</span>
    </div>
  </Entra>
);

const Balcao: React.FC = () => (
  <Tela gap={34}>
    <Passo numero={5} nome="no balcão" />
    <Titulo preta="Os dois caem" azul="no mesmo lugar." atrasa={0.3} />
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 560, marginTop: 10 }}>
      <NoPainel origem="pelo cardápio" atrasa={1.4} />
      <NoPainel origem="pela Lia" atrasa={2.1} />
    </div>
    <Entra atrasa={2.9}>
      <div style={{ fontFamily: FONTE, fontSize: 46, color: T.tinta2 }}>↓</div>
    </Entra>
    <Quadro largura={320} atrasa={3.3}>
      <div
        style={{
          padding: "20px 22px",
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 23,
          color: T.tinta,
          lineHeight: 1.6,
        }}
      >
        PEDIDO #12
        <br />
        1x X-Salada
        <br />
        1x Refrigerante
        <br />
        TOTAL R$ 31,50
      </div>
    </Quadro>
    <Nota atrasa={3.9}>A comanda sai na impressora da cozinha.</Nota>
    <div style={{ height: 24 }} />
    <Legenda atrasa={4.5}>
      e ninguém <Destaque>digitou</Destaque> nada.
    </Legenda>
  </Tela>
);

// ─── fecho ────────────────────────────────────────────────────────────

const Fecho: React.FC = () => (
  <Tela gap={44}>
    <div style={{ flex: 1 }} />
    <Titulo preta="Seu delivery," azul="sem comissão." tamanho={84} />
    <Marca atrasa={1.2} />
    <div style={{ height: 24 }} />
    <Legenda atrasa={2.4}>
      o pedido é <Destaque>seu</Destaque>, o cliente também.
    </Legenda>
  </Tela>
);

// ─── montagem ─────────────────────────────────────────────────────────

const CENAS = [
  [CENA.abre, Abre],
  [CENA.cardapio, Cardapio],
  [CENA.pedido, Pedido],
  [CENA.conversa, Conversa],
  [CENA.anota, Anota],
  [CENA.balcao, Balcao],
  [CENA.fecho, Fecho],
] as const;

export const Tutorial: React.FC = () => (
  <AbsoluteFill style={{ background: T.papel }}>
    <Fundo />
    {CENAS.map(([[de, ate], Cena], i) => (
      <Sequence key={i} from={seg(de)} durationInFrames={seg(ate - de)}>
        <Cena />
      </Sequence>
    ))}
  </AbsoluteFill>
);
