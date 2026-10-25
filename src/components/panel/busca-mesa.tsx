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
    { chave: "mesas", titulo: `Mesas (${mesas.length})`, conteudo: <Grade lugares={mesas} base={base} cols={cols} vazio="Nenhuma mesa cadastrada." /> },
    {
      chave: "balcao",
      titulo: `Balcões (${balcoes.length})`,
      conteudo: <Grade lugares={balcoes} base={base} cols={cols} vazio="Sem lugares de balcão." />,
    },
    ...(caixa ? [{ chave: "caixa", titulo: "Caixa", conteudo: caixa }] : []),
  ];

  // a linha da busca, entre as abas e as mesas -- como no Yooga: a busca à
  // esquerda e a configuração na outra ponta
  const linhaDaBusca = (
    <div className="flex items-center justify-between gap-3">
      <div className="relative w-full max-w-md min-w-0">
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar..."
          aria-label="Procurar mesa pelo número"
          inputMode="numeric"
          className="h-14 w-full rounded-control border border-line bg-surface pr-12 pl-5 font-semibold outline-none placeholder:font-normal placeholder:text-faint focus:border-brand [&::-webkit-search-cancel-button]:hidden"
        />
        {procurando ? (
          <button
            type="button"
            onClick={() => setTexto("")}
            aria-label="Limpar a busca"
            className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-control text-faint hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : (
          <Search className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink/70" aria-hidden="true" />
        )}
      </div>
      {acao}
    </div>
  );

  // Procurando, o resultado toma o lugar das mesas e as abas ficam paradas:
  // quem digita "27" quer a mesa 27, esteja ela no salão ou no balcão.
  const resultado = procurando ? (
    achados.length === 0 ? (
      <p className="rounded-card border border-line bg-surface px-5 py-8 text-center text-muted">
        Nenhuma mesa com <span className="font-bold text-ink">{texto}</span>.
      </p>
    ) : (
      <Grade lugares={achados} base={base} cols={cols} vazio="" />
    )
  ) : undefined;

  return <SalaoAbas abas={abas} entre={linhaDaBusca} noLugar={resultado} />;
}
