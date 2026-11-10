import { db } from "@/lib/db";
import type { PaymentStatus } from "@/generated/prisma/enums";

// O QR Code do Pix deste pedido, como imagem.
//
// Existe por causa do WhatsApp: a Z-API só manda imagem por URL pública --
// não aceita base64 --, e o QR que o Mercado Pago devolve vem justamente
// em base64, guardado no pagamento. Esta rota é a ponte entre os dois.
//
// O que a protege é o mesmo que protege a página do pedido: o `code`, que
// é longo e só quem recebeu o link conhece. E ela devolve menos do que
// essa página já mostra -- só o quadrado preto e branco, sem nome,
// endereço nem valor.
//
// Pedido sem Pix, já pago ou com o QR vencido não tem o que servir: 404.
// Quem chega aqui com um code errado recebe a mesma resposta de quem
// chega com um pedido pago, e isso é de propósito.

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const pedido = await db.order.findUnique({
    where: { code },
    select: { payment: { select: { pixQrBase64: true, pixExpiresAt: true, status: true } } },
  });

  // Pago, recusado ou cancelado não tem QR para mostrar: quem chega aqui
  // depois disso está com um link velho, e um QR vencido pago por engano é
  // dinheiro parado em lugar nenhum.
  const ENCERRADO: PaymentStatus[] = ["CONFIRMED", "REJECTED", "EXPIRED", "REFUNDED", "CANCELED"];
  const p = pedido?.payment;
  if (!p?.pixQrBase64 || ENCERRADO.includes(p.status)) {
    return new Response("sem QR para este pedido", { status: 404 });
  }

  // o base64 do Mercado Pago vem puro, sem o "data:image/png;base64,"
  const png = Buffer.from(p.pixQrBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  if (png.length === 0) return new Response("QR inválido", { status: 404 });

  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      // O QR vale até vencer, e o WhatsApp busca a imagem uma vez só. Cache
      // curto porque um Pix renovado gera outro QR no mesmo endereço.
      "cache-control": "public, max-age=60",
      "content-length": String(png.length),
    },
  });
}
