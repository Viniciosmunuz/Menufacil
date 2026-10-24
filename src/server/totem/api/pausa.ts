import { db } from "@/lib/db";

// O totem pergunta se o dono o pausou.
//
// A tela do totem fica aberta o dia inteiro, e a página só é montada de novo
// de tempos em tempos. Para a pausa ligada no painel aparecer no balcão em
// segundos, e não horas depois, o totem pergunta aqui de vez em quando.
//
// É informação pública -- o próprio totem mostra que está pausado para quem
// passa --, então não pede token: basta o endereço do restaurante.

export async function pausa(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!slug) return Response.json({ erro: "informe o restaurante" }, { status: 400 });

  const restaurante = await db.restaurant.findUnique({
    where: { slug },
    select: { totemEnabled: true, totemPaused: true },
  });
  if (!restaurante?.totemEnabled) return Response.json({ erro: "não existe" }, { status: 404 });

  return Response.json({ pausado: restaurante.totemPaused }, { headers: { "cache-control": "no-store" } });
}
