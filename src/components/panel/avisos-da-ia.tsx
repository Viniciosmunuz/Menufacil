"use client";

import { Headset, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CHOICE_KEY, SOUND_KEY, idList, playSound, read, remember, somEscolhido, useStored } from "@/lib/aviso-local";

// A Lia chamou uma pessoa: sobe no canto, como o pedido e o recado.
//
// O push já existia e continua: ele é para quem está longe da tela. Este
// aviso é para quem está com o painel aberto no balcão -- lá o push não
// chega (o navegador do computador pode nem ter autorizado), e a cliente
// que pediu para falar com alguém ficava esperando sem ninguém saber.
//
// Vai embaixo do recado do chat e acima do pedido novo, na ordem de quem
// está esperando há mais tempo por uma pessoa de verdade.
//
// O som é o mesmo dos outros dois, e isso é decisão: no balcão aquele
// sino já quer dizer "olha a tela". Um segundo som precisaria ser
// aprendido, e enquanto não fosse, seria ruído.
//
// **O que não podia continuar igual era o olho.** Até 24/11/2026 este
// aviso usava a mesma moldura laranja do pedido novo, no mesmo canto e
// com o mesmo botão -- a única diferença era o texto, e texto ninguém lê
// de longe no meio do movimento. No Papaléguas confundiam os dois e
// deixavam cliente esperando achando que era pedido.
//
// Agora: faixa no verde do WhatsApp (é de lá que a pessoa está falando),
// bolinha piscando, "ATENDER AGORA" em caixa alta e o tempo de espera --
// que é o que diz se dá para deixar para depois do movimento ou se
// alguém larga a chapa. Quatro diferenças, nenhuma delas depender de ler.

const VISTOS_KEY = "mf_chamados_vistos";

export type ChamadoNovo = {
  chave: string;
  contato: string;
  quem: string;
  motivo: string;
  /** desde quando ele está esperando, em ISO; sem isso, o tempo não aparece */
  desde?: string;
};

/**
 * Há quanto tempo essa pessoa está esperando.
 *
 * É a informação que decide: "há 1 min" dá para terminar o que está na
 * chapa, "há 12 min" é alguém que já desistiu de ser atendido. Conta no
 * navegador e se atualiza sozinho -- o aviso fica na tela até alguém
 * tocar nele, e um "há 2 min" congelado mentiria depois de dez.
 */
function Espera({ desde }: { desde: string }) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const min = Math.max(0, Math.floor((agora - new Date(desde).getTime()) / 60_000));
  // menos de um minuto não é espera: seria "há 0 min", que não quer dizer nada
  const texto = min < 1 ? "agora" : min < 60 ? `há ${min} min` : `há ${Math.floor(min / 60)} h`;
  return <span className="shrink-0 text-[0.7rem] font-bold opacity-90">{texto}</span>;
}

export function AvisosDaIa({ chamados }: { chamados: ChamadoNovo[] }) {
  const salvos = useStored(VISTOS_KEY);
  const som = useStored(SOUND_KEY) === "1";
  const escolha = somEscolhido(useStored(CHOICE_KEY));

  // o que já estava esperando quando esta tela abriu não vira aviso: abrir
  // o painel depois do almoço despejaria no canto os chamados da manhã
  // inteira, com o sino tocando para conversa que alguém já resolveu
  const aoAbrir = useRef(chamados);

  useEffect(() => {
    remember(
      VISTOS_KEY,
      aoAbrir.current.map((c) => c.chave),
      read(VISTOS_KEY),
    );
  }, []);

  // Antes de o aparelho responder o que já foi visto, nada é novidade: o
  // primeiro render acontece no servidor, quando o armazenamento ainda
  // não foi lido, e tratar isso como "nunca vi nada" faria o sino tocar a
  // cada vez que a tela abrisse.
  const vistos = idList(salvos);
  const novos = salvos === null ? [] : chamados.filter((c) => !vistos.includes(c.chave));

  useEffect(() => {
    if (novos.length === 0 || !som) return;
    void playSound(escolha).catch(() => {});
  }, [novos.length, som, escolha]);

  if (novos.length === 0) return null;

  const dispensar = (chaves: string[]) => remember(VISTOS_KEY, chaves, read(VISTOS_KEY));

  return (
    <>
      {novos.slice(0, 2).map((c) => (
        <div key={c.chave} className="overflow-hidden rounded-card shadow-2xl shadow-black/50">
          {/* A faixa, fina de propósito: ele pediu que não fosse grossa.
              O que ela precisa é ser vista de relance, e para isso bastam
              a cor, a bolinha e a palavra. */}
          <div className="flex items-center gap-2 bg-zap px-3 py-1.5 text-white">
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-white" />
            <span className="flex-1 text-[0.7rem] font-extrabold uppercase tracking-wider">
              Atender agora
            </span>
            {c.desde && <Espera desde={c.desde} />}
          </div>

          <div className="flex flex-col gap-2 border border-t-0 border-zap/70 bg-surface p-3">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-extrabold">{c.quem}</span>
              <button
                type="button"
                onClick={() => dispensar([c.chave])}
                aria-label={`Dispensar o aviso de ${c.quem}`}
                className="-my-1 grid size-8 shrink-0 place-items-center rounded-control text-faint hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {/* o motivo diz se dá para deixar para depois do movimento */}
            <p className="truncate text-sm text-muted">{c.motivo}</p>

            {/* Abre a conversa no WhatsApp, e não no painel: o cliente
                está lá, esperando uma pessoa responder. Mandar para a
                tela de conversas daqui faria quem atende ler o que já
                sabe e depois procurar o número na mão. */}
            <a
              href={`https://wa.me/${c.contato.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => dispensar([c.chave])}
              className="flex items-center justify-center gap-2 rounded-control bg-zap px-4 py-2 text-sm font-bold text-white hover:bg-zap-escuro"
            >
              <Headset className="size-4" aria-hidden="true" />
              Responder no WhatsApp
            </a>
          </div>
        </div>
      ))}

      {novos.length > 2 && (
        <button
          type="button"
          onClick={() => dispensar(novos.map((c) => c.chave))}
          className="rounded-card border border-line bg-surface px-4 py-2 text-center text-sm font-bold text-muted shadow-xl hover:text-ink"
        >
          e mais {novos.length - 2} {novos.length - 2 === 1 ? "pessoa esperando" : "pessoas esperando"}
        </button>
      )}
    </>
  );
}
