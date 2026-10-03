"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { copyToClipboard } from "@/components/ui/copy-button";

// Guardar o link do pedido fora do navegador.
//
// A aba "Pedidos" do rodapé é memória do navegador do aparelho. Quem abriu
// o cardápio dentro do Instagram, pediu ali e depois foi conferir no
// Chrome não acha nada: são memórias separadas. Vale o mesmo para aba
// anônima, dados limpos e celular trocado.
//
// No fluxo do WhatsApp isso não doía, porque o link ficava na conversa do
// cliente com o restaurante. No 100% Delivery ninguém manda esse link para
// lugar nenhum -- então ele precisa de um jeito de sair daqui.
//
// Compartilhar é o caminho principal: a bandeja do celular deixa mandar
// para o próprio WhatsApp, para as Notas, para onde a pessoa quiser. Onde
// não existe bandeja (computador, navegador antigo), fica copiar.

export function GuardarLink({ texto }: { texto: string }) {
  const [feito, setFeito] = useState<"copiado" | null>(null);

  async function guardar() {
    const url = window.location.href;
    // a bandeja do sistema não existe em todo navegador, e o usuário pode
    // fechar sem escolher nada: nos dois casos, copiar resolve
    if ("share" in navigator) {
      try {
        await navigator.share({ title: texto, url });
        return;
      } catch {
        // fechou a bandeja ou o navegador recusou: cai no copiar
      }
    }
    await copyToClipboard(url);
    setFeito("copiado");
    setTimeout(() => setFeito(null), 2500);
  }

  return (
    <button
      type="button"
      onClick={guardar}
      className="mx-auto flex h-11 items-center gap-2 rounded-control border border-line px-4 text-sm font-bold text-muted hover:border-line-strong hover:text-ink"
    >
      {feito ? (
        <>
          <Check className="size-4 text-success" aria-hidden="true" />
          Link copiado! Cole onde quiser guardar
        </>
      ) : (
        <>
          {/* um ícone só: qual dos dois caminhos vai valer só se sabe no
              toque, e trocar o ícone depois do primeiro desenho faria a
              tela piscar por nada */}
          <Share2 className="size-4" aria-hidden="true" />
          Guardar o link deste pedido
        </>
      )}
    </button>
  );
}
