import { UtensilsCrossed } from "lucide-react";

// O recado que o garçom recebe quando a tela existe mas o salão não está
// no ar para o restaurante dele.
//
// O login manda todo garçom para cá, inclusive o de uma casa que ainda não
// pediu o Salão -- e antes ele batia num 404 seco, sem saber o que houve
// nem a quem recorrer. Quem está de avental não tem como adivinhar que
// falta um recurso ser liberado na plataforma.

export function SalaoNaoLiberado({ nome }: { nome: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-surface-2 text-faint">
        <UtensilsCrossed className="size-9" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-extrabold">Salão ainda não liberado</h1>
      <p className="text-muted">
        O atendimento na mesa não está ativo em {nome}. Fale com o dono do restaurante: é ele quem pede a liberação.
      </p>
    </main>
  );
}
