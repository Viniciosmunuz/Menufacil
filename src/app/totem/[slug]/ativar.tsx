"use client";

import { CheckCircle2, MonitorSmartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

import { aparelho, esquecerAparelho, guardarAparelho } from "./ponte";

// Ativar um tablet como totem deste restaurante.
//
// O cardápio é público -- qualquer um abre o link e olha. Cobrar é outra
// coisa: para isso o aparelho precisa estar ativado, e quem ativa é o dono,
// uma vez, com um código que ele gera no painel.
//
// A tela só aparece com "?ativar=1" no endereço. O cliente no balcão nunca
// chega aqui, e o dono chega quando quiser trocar o tablet de lugar.

export function AtivarTotem({ slug, nome }: { slug: string; nome: string }) {
  const router = useRouter();
  const jaAtivo = aparelho();

  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function ativar() {
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/totem/parear", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo: codigo.trim(), nome: "Tablet", versao: "web" }),
      });
      const dados = (await resposta.json()) as {
        erro?: string;
        token?: string;
        restaurante?: { id: string; nome: string };
      };

      if (dados.erro || !dados.token || !dados.restaurante) {
        setErro(dados.erro ?? "Não consegui ativar. Confira o código.");
        return;
      }

      guardarAparelho({ token: dados.token, restaurantId: dados.restaurante.id, restauranteNome: dados.restaurante.nome });
      router.replace(`/totem/${slug}`);
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <Card className="flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center gap-3">
          <MonitorSmartphone className="size-9 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-extrabold">Ativar este aparelho</h1>
            <p className="text-sm text-muted">Totem de {nome}</p>
          </div>
        </div>

        {jaAtivo ? (
          <>
            <Alert tone="success">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                Este aparelho já está ativado e pode cobrar.
              </span>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => router.replace(`/totem/${slug}`)}>
                Ir para o cardápio
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  esquecerAparelho();
                  router.refresh();
                }}
              >
                Desativar este aparelho
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              No painel do restaurante, em <strong className="text-ink">Totem</strong>, toque em{" "}
              <strong className="text-ink">Gerar código</strong> e digite aqui. É uma vez só por aparelho.
            </p>

            <Field label="Código do totem" htmlFor="codigo" hint="Fica parecido com TT-8K29-XP4.">
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && ativar()}
                placeholder="TT-0000-000"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="text-center text-xl tracking-widest"
              />
            </Field>

            {erro && <Alert tone="danger">{erro}</Alert>}

            <Button variant="primary" size="lg" onClick={ativar} disabled={enviando || codigo.trim().length < 8}>
              {enviando ? "Ativando..." : "Ativar"}
            </Button>

            <p className="text-xs text-faint">
              Sem ativar, este aparelho mostra o cardápio normalmente, mas não cobra. É assim que dá para conferir a tela
              pelo celular sem risco.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
