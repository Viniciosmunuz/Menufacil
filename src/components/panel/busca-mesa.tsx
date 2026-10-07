"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

import { MesaCard } from "@/components/panel/mesa-card";
import { SalaoAbas, type Aba } from "@/components/panel/salao-abas";
import type { LugarNoMapa } from "@/server/salao/mesas";

// Procurar uma mesa no salão.
//
// Num salão de quarenta mesas, achar a 27 custa percorrer a grade com o
// olho. Digitar "27" resolve, e filtra enquanto se digita -- sem ida ao
// servidor, porque a lista inteira já está na tela.
//
// A busca tomou o lugar do título. "Salão / toque numa mesa para ver a
// comanda" ocupava a parte de cima com uma instrução que se lê uma vez na
// vida; a barra ocupa o mesmo espaço fazendo trabalho todo dia.
//
// Procurando, as abas somem: quem digita "27" quer a mesa 27, esteja ela no
// salão ou no balcão, e trocar de aba para achá-la seria devolver o
// problema que a busca veio resolver.

const limpo = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function Grade({ lugares, base, cols, vazio }: { lugares: LugarNoMapa[]; base: string; cols: string; vazio: string }) {
  if (lugares.length === 0) {
    return <p className="rounded-card border border-line bg-surface px-5 py-8 text-center text-muted">{vazio}</p>;
  }
  return (
    <div className={cols}>
      {lugares.map((l) => (
        <MesaCard key={l.id} lugar={l} href={`${base}/mesa/${l.id}`} />
      ))}
    </div>
  );
}

export function SalaoComBusca({
  mesas,
  balcoes,
  base,
  cols,
  caixa,
  acao,
}: {
  mesas: LugarNoMapa[];
  balcoes: LugarNoMapa[];
  base: string;
  cols: string;
  /** só o painel do dono passa o caixa; o garçom não tem essa aba */
  caixa?: React.ReactNode;
  /** o botão de configuração, que fica na linha da busca */
  acao?: React.ReactNode;
}) {
  const [texto, setTexto] = useState("");
  const procurando = limpo(texto).length > 0;

  const combina = (l: LugarNoMapa) => {
    const alvo = limpo(`${l.tipo === "BALCAO" ? "balcao balcão" : "mesa"} ${l.numero} ${l.nome ?? ""}`);
    return limpo(texto)
      .split(/\s+/)
      .every((p) => alvo.includes(p));
  };

  const achados = procurando ? [...mesas, ...balcoes].filter(combina) : [];

  const abas: Aba[] = [
    { chave: "mesas", titulo: "Mesas", conteudo: <Grade lugares={mesas} base={base} cols={cols} vazio="Nenhuma mesa cadastrada." /> },
    {
      chave: "balcao",
      titulo: "Balcão",
      conteudo: <Grade lugares={balcoes} base={base} cols={cols} vazio="Sem lugares de balcão." />,
    },
    ...(caixa ? [{ chave: "caixa", titulo: "Caixa", conteudo: caixa }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* a engrenagem divide a linha com a busca, e só com ela.
          
          Estava num flex por fora do bloco inteiro, e aí os cinquenta e
          poucos pixels dela saíam da largura de tudo que vinha abaixo --
          num celular, isso é meia mesa a menos por linha. */}
      <div className="flex items-start gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-faint" aria-hidden="true" />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Procurar mesa"
          aria-label="Procurar mesa pelo número"
          inputMode="numeric"
          className="h-12 w-full rounded-control border border-line bg-surface pr-12 pl-12 font-bold outline-none placeholder:font-normal placeholder:text-faint focus:border-brand [&::-webkit-search-cancel-button]:hidden"
        />
          {procurando && (
            <button
              type="button"
              onClick={() => setTexto("")}
              aria-label="Limpar a busca"
              className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-control text-faint hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {acao}
      </div>

      {procurando ? (
        achados.length === 0 ? (
          <p className="rounded-card border border-line bg-surface px-5 py-8 text-center text-muted">
            Nenhuma mesa com <span className="font-bold text-ink">{texto}</span>.
          </p>
        ) : (
          <Grade lugares={achados} base={base} cols={cols} vazio="" />
        )
      ) : (
        <SalaoAbas abas={abas} />
      )}
    </div>
  );
}
