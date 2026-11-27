"use client";

import { Check, Copy } from "lucide-react";
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
// **As medidas aqui foram tiradas da tela, não estimadas.** A faixa da
// capa é 3,2 vezes mais larga que alta e a imagem chega em 16:9, então o
// navegador corta de cima e de baixo e sobra pouco mais da metade do
// meio. A logo do restaurante entra por cima do canto de baixo à
// esquerda, e é ali que o texto sumia nos primeiros testes. Mudou a
// faixa na tela? Estes números mudam junto, senão o prompt passa a
// mentir.

const PROMPT = `Crie uma imagem de banner para o topo do cardápio digital do meu restaurante.

FORMATO
- Proporção 16:9, 1600 x 900 pixels, deitada.

ONDE NÃO PODE ENTRAR NADA IMPORTANTE
- O sistema corta a imagem em cima e embaixo: só aparece a faixa do meio. Todo o texto e o produto principal têm que ficar entre 25% e 75% da altura.
- A logo do restaurante entra por cima do canto de baixo à esquerda. Deixe esse canto só com fundo: nada de texto no terço esquerdo da metade de baixo.
- No alto à direita ficam os botões do site. Deixe livre.
- Centralize o texto no meio, ou jogue para a direita.

TEXTO NA IMAGEM
- Título: [ESCREVA AQUI — ex.: TERÇA DA PIZZA]
- Uma linha abaixo: [ESCREVA AQUI — ex.: 2 brotinhos por R$ 35]
- Só essas duas linhas. Letra grande e grossa, que dê para ler num celular pequeno de longe.
- Escreva o texto exatamente como está acima, em português, sem erro de ortografia e sem inventar outras palavras.

ESTILO
- [DESCREVA AQUI — ex.: foto da pizza saindo do forno a lenha, fundo escuro, luz quente]
- Imagem limpa, sem moldura, sem borda, sem marca d'água e sem nenhuma logo.`;

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
      <Button type="button" variant="secondary" size="sm" className="self-start" onClick={copiar}>
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
