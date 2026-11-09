import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { conversarNoCardapio } from "@/server/ia/chat";

/**
 * O chat da IA no cardápio.
 *
 * Rota pública: quem escreve é o cliente do restaurante, sem conta e sem
 * login. Por isso ela é estreita de propósito -- recebe um texto curto, o
 * slug do restaurante e uma sessão do navegador, e devolve a resposta.
 * Nada mais entra, nada mais sai.
 *
 * As travas que importam numa rota aberta:
 * - o texto é limitado no servidor, não só no formulário;
 * - a sessão é só um rótulo de conversa e vem do navegador, então nunca
 *   serve para identificar ou autorizar nada;
 * - a IA só responde onde o dono ligou a chave, e isso é conferido aqui
 *   dentro, no servidor;
 * - o teto por sessão mora no `conversarNoCardapio`.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const TEXTO_MAX = 1200;
const SESSAO_MAX = 60;

export async function POST(request: NextRequest) {
  let corpo: { slug?: unknown; sessao?: unknown; texto?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const slug = typeof corpo.slug === "string" ? corpo.slug.slice(0, 80) : "";
  const sessao =
    typeof corpo.sessao === "string" ? corpo.sessao.slice(0, SESSAO_MAX) : "";
  const texto =
    typeof corpo.texto === "string" ? corpo.texto.slice(0, TEXTO_MAX).trim() : "";

  if (!slug || !sessao || !texto) {
    return NextResponse.json({ erro: "faltou slug, sessão ou texto" }, { status: 400 });
  }

  const restaurante = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
  if (!restaurante || restaurante.status !== "ACTIVE") {
    return NextResponse.json({ erro: "restaurante não encontrado" }, { status: 404 });
  }

  try {
    const r = await conversarNoCardapio({
      restaurantId: restaurante.id,
      sessao,
      texto,
    });

    if (r.ok) return NextResponse.json({ texto: r.texto, anexos: r.anexos });

    // Cada recusa tem a sua resposta na tela. "Desligada" é a única que o
    // cliente nunca deveria ver: se chegou aqui, a bolha não devia nem ter
    // aparecido.
    const aviso: Record<typeof r.motivo, string> = {
      desligada: "O atendimento por aqui está desligado no momento.",
      fechado: "O restaurante está fechado agora. Dá uma olhada no cardápio e volte no horário de funcionamento!",
      teto: "Conversamos bastante por agora. Chama de novo daqui a pouco, ou fale direto com o restaurante.",
      vazio: "Escreva a sua pergunta que eu respondo.",
      falha: "Não consegui responder agora. Tente de novo em instantes.",
    };
    return NextResponse.json({ texto: aviso[r.motivo], anexos: [], recusa: r.motivo });
  } catch (erro) {
    console.error("[ia/chat] falhou:", erro);
    return NextResponse.json(
      { erro: "não consegui responder agora" },
      { status: 500 },
    );
  }
}
