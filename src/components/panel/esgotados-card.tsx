import { PackageX } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Gaveta } from "@/components/ui/gaveta";
import { SwitchButton } from "@/components/ui/switch-button";

export type Esgotado = { id: string; nome: string; secao: string | null };

// O que acabou, e o caminho de volta.
//
// Marcar esgotado é fácil no meio do movimento; religar é o que todo mundo
// esquece, porque exigia ir ao cardápio, achar o produto e voltar -- por um
// toque. Então a lista inteira abre aqui, com o mesmo interruptor do
// cardápio ao lado de cada nome: chegou a mercadoria, liga e pronto.
//
// É a mesma gaveta do fechamento do dia, de propósito: ela tinha moldura
// âmbar e corpo próprio, e ficava gritando numa coluna em que todo o resto
// é cinza. O aviso continua -- o cartão só existe quando falta alguma coisa
// --, mas agora ele é um vizinho, não um alarme.
//
// Nasce fechada porque isto é aviso, não tarefa: quem está olhando a tela
// inicial quer saber que falta alguma coisa, e só às vezes resolver agora.

export function EsgotadosCard({
  esgotados,
  cardapioHref,
  toggleAction,
  restaurantId,
}: {
  esgotados: Esgotado[];
  cardapioHref: string;
  toggleAction: (formData: FormData) => Promise<void>;
  restaurantId: string;
}) {
  if (esgotados.length === 0) return null;

  const um = esgotados.length === 1;

  return (
    <Gaveta
      titulo={um ? "1 produto esgotado" : `${esgotados.length} produtos esgotados`}
      resumo={`${esgotados.map((p) => p.nome).join(", ")} — não ${um ? "aparece" : "aparecem"} para o cliente`}
      icone={<PackageX />}
    >
      <ul className="flex flex-col divide-y divide-line">
        {esgotados.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="min-w-0">
              <span className="block truncate font-bold">{p.nome}</span>
              {p.secao && <span className="block truncate text-xs text-faint">{p.secao}</span>}
            </span>
            <form action={toggleAction} className="shrink-0">
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="field" value="available" />
              <SwitchButton checked={false} label="Religar" />
            </form>
          </li>
        ))}
      </ul>

      <Link href={cardapioHref} className={buttonClasses("secondary", "sm", "self-start")}>
        Ver o cardápio
      </Link>
    </Gaveta>
  );
}
