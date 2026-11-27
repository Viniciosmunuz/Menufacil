"use client";

import { Check, Copy, Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

// O pedido pronto para a IA de imagem do dono.
//
// Ninguém no balcão tem designer, e banner feito no olho sai errado de
// três jeitos: na proporção, no corte e por cima da logo. As três coisas
// só se descobrem depois de subir e olhar no celular.
//
// Então o painel entrega o pedido pronto. O dono copia, cola no ChatGPT
// (ou no que ele usar), troca o que está entre colchetes e recebe a
// imagem já no formato certo.
//
// **As medidas aqui foram tiradas da tela, não estimadas**, e foram
// refeitas em 27/11/2026, quando a capa encolheu para caber o cartão do
// destaque na primeira tela. Hoje: a faixa é 4,09 vezes mais larga que
// alta, a imagem chega em 16:9, e por isso sobram 43,5% da altura dela
// -- os 28% de cima e os 28% de baixo somem no corte. A logo do
// restaurante, de 64px, cobre o quinto esquerdo da parte que sobra.
//
// Mudou a altura da capa? Estes números mudam junto, senão o prompt e o
// desenho passam a mentir -- foi exatamente o que aconteceu com a
// primeira versão deles, escrita para a capa de 112px.
//
// **Curto, numerado e no positivo**, e isso foi aprendido errando. A
// primeira versão tinha quatro títulos e uma lista de proibições --
// "não ponha nada aqui", "deixe aquele canto livre". A IA de imagem
// leu tudo e obedeceu nada: veio um banner com letra em cada canto,
// logo inventada e o nome do restaurante escrito por cima de onde a
// logo de verdade entra.
//
// Modelo de imagem não é bom com proibição; é bom com cena. Então as
// mesmas regras viraram descrição do que deve existir -- "o quinto
// esquerdo é só fundo liso" em vez de "não escreva à esquerda" -- e
// cabem em seis linhas numeradas. O que o dono troca são as duas
// primeiras, e elas ficam no alto.

const PROMPT = `Banner 16:9 (1600 x 900) para cardápio digital de restaurante.

Produto: [TROQUE AQUI — ex.: sorvetes e milkshakes]
Frase: [TROQUE AQUI — ex.: NOVIDADES NO CARDÁPIO]

Composição, nesta ordem de importância:
1. O quinto esquerdo da imagem é só fundo liso, sem produto e sem letra nenhuma.
2. O produto aparece grande no centro e na direita.
3. A frase vai em letra grande e grossa, na faixa do meio da altura.
4. Nada importante nos 30% de cima nem nos 30% de baixo: essas partes são cortadas.
5. Escreva a frase exatamente como está acima, em português.
6. Sem logo, sem moldura, sem borda e sem marca d'água.`;


/**
 * O mapa da faixa: onde pode e onde não pode pôr coisa.
 *
 * Nasceu de um banner que voltou errado da IA. O pedido por escrito
 * explicava as zonas em palavras ("nada no quarto de cima", "deixe o
 * canto de baixo à esquerda livre"), e palavra sobre espaço é o tipo de
 * coisa que só fica clara quando se vê.
 *
 * Então o painel desenha. As três faixas cinzas são as que somem ou
 * ficam cobertas; o claro do meio é o que o cliente enxerga. O dono
 * pode olhar antes de subir a arte -- e pode mandar este desenho junto
 * com o pedido para a IA, que é onde ele resolve mais.
 *
 * É um desenho, não uma foto: nasce do mesmo cálculo da faixa de
 * verdade (16:9 chegando numa faixa 3,2:1, logo de 80px no canto), e
 * não de um arquivo que alguém exportou uma vez e esqueceu de
 * atualizar.
 */

/** quanto da altura da imagem sobra depois do corte da faixa */
const VISIVEL = 0.435;
/** quanto da largura a logo do restaurante cobre */
const LOGO_LARGURA = 0.22;
/** quanto da parte visível a logo cobre, de baixo para cima */
const LOGO_ALTURA = 32 / 88;

/**
 * O modelo em imagem, no tamanho exato do banner.
 *
 * O desenho na tela serve para o dono entender; este arquivo serve para
 * a IA. Ele pediu assim e está certo: modelo de imagem entende um mapa
 * de composição muito melhor do que a mesma regra escrita, e anexar o
 * arquivo junto com o texto é o que faz as duas coisas chegarem juntas.
 *
 * Desenhado aqui, em 1600 x 900 -- o mesmo tamanho que o pedido manda a
 * IA gerar. Então não é um retrato do mapa: é a própria medida, e quem
 * abrir o arquivo pode pôr a arte por cima para conferir.
 *
 * Feito no canvas, e não exportando o SVG da tela: o SVG pinta com as
 * classes do tema, que não viajam para dentro de um arquivo solto -- o
 * modelo sairia sem cor nenhuma.
 */
function baixarModelo() {
  const L = 1600;
  const A = 900;
  const corte = Math.round((A * (1 - VISIVEL)) / 2);
  const faixa = A - corte * 2;
  const logoL = Math.round(L * LOGO_LARGURA);
  const logoA = Math.round(faixa * LOGO_ALTURA);

  const tela = document.createElement("canvas");
  tela.width = L;
  tela.height = A;
  const c = tela.getContext("2d");
  if (!c) return;

  c.fillStyle = "#f6f1ea";
  c.fillRect(0, 0, L, A);

  // as duas pontas que o navegador corta
  c.fillStyle = "#cfc6b8";
  c.fillRect(0, 0, L, corte);
  c.fillRect(0, A - corte, L, corte);

  // o canto que a logo do restaurante cobre
  c.fillStyle = "#a99e8c";
  c.fillRect(0, A - corte - logoA, logoL, logoA);
  c.fillStyle = "#7d7465";
  c.beginPath();
  c.arc(logoL / 2, A - corte - logoA / 2, logoA * 0.33, 0, Math.PI * 2);
  c.fill();

  c.textAlign = "center";
  c.textBaseline = "middle";

  c.fillStyle = "#6b6257";
  c.font = "bold 44px Arial, Helvetica, sans-serif";
  c.fillText("CORTADO — NÃO PONHA NADA AQUI", L / 2, corte / 2);
  c.fillText("CORTADO — NÃO PONHA NADA AQUI", L / 2, A - corte / 2);

  c.fillStyle = "#ffffff";
  c.font = "bold 34px Arial, Helvetica, sans-serif";
  c.fillText("A LOGO", logoL / 2, A - corte - logoA - 34);
  c.fillStyle = "#6b6257";
  c.fillText("A LOGO COBRE", logoL / 2 + 40, A - corte - logoA - 34);

  c.fillStyle = "#2b2b2b";
  c.font = "bold 64px Arial, Helvetica, sans-serif";
  c.fillText("PRODUTO E FRASE AQUI", (logoL + L) / 2, A / 2);

  tela.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-banner-menufacil.png";
    a.click();
    // o navegador segura o arquivo até o clique acontecer; soltar antes
    // disso cancela o download no Chrome
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, "image/png");
}

function MapaDaFaixa() {
  // 320 x 180 é 16:9, a proporção em que a imagem chega.
  //
  // Os números saem da faixa de verdade, medida no navegador: ela tem
  // 360 x 88, a imagem de 16:9 renderiza com 203 de altura, e por isso
  // sobram 43,5% dela. A logo de 64px ocupa 22% da largura e cobre os
  // 32px de baixo da parte que sobra.
  const corte = (180 * (1 - VISIVEL)) / 2;
  const faixa = 180 * VISIVEL;
  const logoL = 320 * LOGO_LARGURA;
  const logoA = faixa * LOGO_ALTURA;

  return (
    <figure className="max-w-[22rem]">
      <svg
        viewBox="0 0 320 180"
        className="w-full rounded-control border border-line"
        role="img"
        aria-label="Mapa do banner: os 28% de cima e os 28% de baixo da imagem são cortados, e a logo do restaurante cobre o canto de baixo à esquerda do que sobra."
      >
        <rect width="320" height="180" className="fill-surface-2" />

        {/* o que o navegador corta */}
        <rect x="0" y="0" width="320" height={corte} className="fill-ink/15" />
        <rect x="0" y={180 - corte} width="320" height={corte} className="fill-ink/15" />

        {/* Onde a logo entra, dentro da parte que aparece.
            Mais escura que as faixas cortadas de propósito: nas duas com
            o mesmo cinza, o bloco da logo encostava na faixa de baixo e
            os dois viravam uma mancha só. */}
        <rect x="0" y={180 - corte - logoA} width={logoL} height={logoA} className="fill-ink/25" />
        <circle cx={logoL / 2} cy={180 - corte - logoA / 2} r={logoA * 0.38} className="fill-ink/45" />

        <text x="160" y={corte / 2 + 4} textAnchor="middle" className="fill-muted text-[11px] font-bold">
          cortado
        </text>
        <text x="160" y={180 - corte / 2 + 4} textAnchor="middle" className="fill-muted text-[11px] font-bold">
          cortado
        </text>
        <text x={logoL / 2 + 18} y={180 - corte - logoA - 6} textAnchor="middle" className="fill-muted text-[10px] font-bold">
          a logo cobre
        </text>
        <text x="205" y={90 - 2} textAnchor="middle" className="fill-ink text-[12px] font-extrabold">
          produto e frase
        </text>
        <text x="205" y={90 + 13} textAnchor="middle" className="fill-muted text-[10px]">
          aqui
        </text>
      </svg>
    </figure>
  );
}

export function PromptDaIa() {
  const [copiado, setCopiado] = useState(false);
  const [mostrandoTexto, setMostrandoTexto] = useState(false);

  // o "Copiado!" volta sozinho: botão que fica preso no estado de
  // sucesso faz a pessoa achar que o segundo clique não funcionou
  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2500);
    return () => clearTimeout(t);
  }, [copiado]);

  /**
   * Copia, por três caminhos.
   *
   * A área de transferência moderna falha em mais lugar do que parece:
   * permissão negada, página sem HTTPS, navegador antigo do tablet do
   * balcão. Então, quando ela não vai, tenta o jeito velho -- uma caixa
   * de texto escondida e o comando de copiar de sempre, que não pede
   * permissão a ninguém.
   *
   * Falharam os dois, o texto aparece selecionado na tela e a pessoa
   * copia na mão. Pior, mas não é um botão que não faz nada.
   */
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopiado(true);
      return;
    } catch {
      // o caminho novo não foi; abaixo vai o antigo
    }

    try {
      const caixa = document.createElement("textarea");
      caixa.value = PROMPT;
      // fora da vista, mas dentro da página: o comando antigo não copia
      // de um campo com `display: none`
      caixa.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(caixa);
      caixa.select();
      const foi = document.execCommand("copy");
      caixa.remove();
      if (foi) {
        setCopiado(true);
        return;
      }
    } catch {
      // nem o antigo: resta mostrar
    }

    setMostrandoTexto(true);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Os dois juntos, porque são um gesto só: copiar o pedido e
          anexar o modelo na mesma conversa com a IA. */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={copiar}>
          {copiado ? (
            <>
              <Check className="size-4" aria-hidden="true" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="size-4" aria-hidden="true" />
              Copiar pedido para a IA
            </>
          )}
        </Button>

        <Button type="button" variant="secondary" size="sm" onClick={baixarModelo}>
          <Download className="size-4" aria-hidden="true" />
          Baixar o modelo
        </Button>
      </div>

      <MapaDaFaixa />

      {mostrandoTexto && (
        <textarea
          readOnly
          rows={10}
          value={PROMPT}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-control border border-line bg-surface p-3 font-mono text-xs"
        />
      )}
    </div>
  );
}
