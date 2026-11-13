"use client";

import { Headset, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { buttonClasses } from "@/components/ui/button";
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

const VISTOS_KEY = "mf_chamados_vistos";

export type ChamadoNovo = {
  chave: string;
  contato: string;
  quem: string;
  motivo: string;
};

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
        <div
          key={c.chave}
          className="flex flex-col gap-1.5 rounded-card border border-brand/60 bg-surface p-3 shadow-2xl shadow-black/50"
        >
          <div className="flex items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <Headset className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{c.quem} quer falar com você</span>
            {/* Abre a conversa no WhatsApp, e não no painel: o cliente
                está lá, esperando uma pessoa responder. Mandar para a
                tela de conversas daqui faria quem atende ler o que já
                sabe e depois procurar o número na mão. */}
            <a
              href={`https://wa.me/${c.contato.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => dispensar([c.chave])}
              className={buttonClasses("primary", "sm")}
            >
              Responder
            </a>
            <button
              type="button"
              onClick={() => dispensar([c.chave])}
              aria-label={`Dispensar o aviso de ${c.quem}`}
              className="grid size-8 shrink-0 place-items-center rounded-control text-faint hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* o motivo ganha a linha inteira: é o que diz se dá para deixar
              para depois do movimento ou se alguém tem de largar a chapa */}
          <p className="truncate pl-9 text-sm text-muted">{c.motivo}</p>
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
