import "server-only";

import { db } from "@/lib/db";

/**
 * Apaga o que a IA guarda só por alguns minutos e nunca mais lê.
 *
 * Duas tabelas cresciam para sempre sem servir a ninguém:
 *
 * - `IaEventoProcessado` ganha uma linha por mensagem de WhatsApp, e
 *   existe só para a mesma mensagem não ser respondida duas vezes
 *   quando o provedor reenvia. Reenvio acontece em minutos; depois de
 *   uma semana aquela linha não protege mais nada.
 * - `IaChamado` vale três horas como aviso no painel.
 *
 * **Não toca em conversa nem em pedido.** O histórico das conversas
 * (`IaMensagem`) é o que o dono lê no painel e fica como está; pedido
 * antigo ele decidiu não apagar.
 *
 * Roda de carona nas mensagens que chegam, uma vez a cada cinquenta, em
 * vez de num agendamento: assim ela só trabalha em restaurante que tem
 * movimento -- que é onde as tabelas crescem -- e não precisa de cron,
 * que no plano atual da Vercel é um por dia.
 */

const GUARDA_MS = 7 * 24 * 60 * 60 * 1000;
const UMA_A_CADA = 50;

export async function faxinaDaIa() {
  if (Math.floor(Math.random() * UMA_A_CADA) !== 0) return;
  const limite = new Date(Date.now() - GUARDA_MS);
  try {
    const [eventos, chamados] = await Promise.all([
      db.iaEventoProcessado.deleteMany({ where: { createdAt: { lt: limite } } }),
      db.iaChamado.deleteMany({ where: { createdAt: { lt: limite } } }),
    ]);
    if (eventos.count + chamados.count > 0) {
      console.info(`[ia/faxina] ${eventos.count} eventos e ${chamados.count} chamados antigos apagados`);
    }
  } catch (erro) {
    // faxina que falha não pode atrapalhar o atendimento: fica para a próxima
    console.error("[ia/faxina] falhou:", erro);
  }
}
