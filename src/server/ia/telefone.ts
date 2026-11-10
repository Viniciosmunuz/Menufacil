import "server-only";

import { normalizePhone } from "@/lib/format";

// O nove que o WhatsApp às vezes esquece.
//
// Mora num arquivo só dele porque é usado dos dois lados: por quem anota o
// pedido e por quem avisa que o pagamento caiu. Deixá-lo em `pedido.ts`
// fazia o aviso de pagamento importar o anotador, que importa o Pix, que
// importa o aviso -- uma roda que só não quebrou por sorte da ordem em que
// o Node carrega os arquivos.

/**
 * O telefone do WhatsApp no formato do site.
 *
 * O WhatsApp ainda manda muito celular brasileiro sem o 9 da frente
 * (5592 8123-4567); o site grava com ele. Sem acertar isso, o pedido do
 * site não seria achado pelo número da conversa.
 */
export function telefoneDoSite(telefone: string) {
  const d = normalizePhone(telefone);
  return /^55\d{2}[6-9]\d{7}$/.test(d) ? `${d.slice(0, 4)}9${d.slice(4)}` : d;
}

/** o mesmo número com e sem o 9, para achar pedido gravado de qualquer jeito */
export function variantes(telefone: string) {
  const d = telefoneDoSite(telefone);
  const sem9 = /^55\d{2}9\d{8}$/.test(d) ? `${d.slice(0, 4)}${d.slice(5)}` : null;
  return sem9 ? [d, sem9] : [d];
}
