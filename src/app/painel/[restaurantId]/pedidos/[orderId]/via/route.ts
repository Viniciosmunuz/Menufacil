import { orderSummarySelect } from "@/components/panel/order-summary";
import { db } from "@/lib/db";
import { ticketText } from "@/lib/ticket";
import { requireRestaurantAccess } from "@/server/auth/dal";

// Via do pedido para a impressora térmica. Rota (e não página) porque a via
// tem a folha toda para ela, sem a casca do painel.
// - ?formato=texto devolve só o texto, que é o que o RawBT imprime no celular.
// - sem parâmetro, devolve a página que manda imprimir sozinha ao abrir.

const escape = (text: string) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);

export async function GET(request: Request, { params }: RouteContext<"/painel/[restaurantId]/pedidos/[orderId]/via">) {
  const { restaurantId, orderId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);

  const order = await db.order.findFirst({ where: { id: orderId, restaurantId: restaurant.id }, select: orderSummarySelect });
  if (!order) return new Response("Pedido não encontrado.", { status: 404 });

  const text = ticketText(order, restaurant.name);
  const headers = { "cache-control": "no-store" };

  if (new URL(request.url).searchParams.get("formato") === "texto") {
    return new Response(text, { headers: { ...headers, "content-type": "text/plain; charset=utf-8" } });
  }

  // 80 mm de papel; na bobina de 58 mm o que sobra é só margem
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pedido #${order.number}</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  pre { margin: 0; font-family: ui-monospace, "Courier New", monospace; font-size: 12px; line-height: 1.35; white-space: pre-wrap; word-break: break-word; }
  @media screen { body { padding: 12px; } pre { max-width: 80mm; } }
</style>
</head>
<body>
<pre>${escape(text)}</pre>
<script>
  // o painel escuta este aviso: sem ele, entende que a impressão não foi
  function avisar() { try { parent.postMessage({ mf: "impresso", id: ${JSON.stringify(order.id)} }, location.origin); } catch (e) {} }
  window.addEventListener("afterprint", avisar);
  window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 200); });
</script>
</body>
</html>`;

  return new Response(html, { headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
}
