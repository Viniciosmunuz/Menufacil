import { Bike, Phone } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatPhone } from "@/lib/format";

// Quem está levando o pedido.
//
// É o que tira a ansiedade de quem está esperando: sai de "meu pedido
// sumiu" para "o Carlos está vindo, de Honda Titan". Nome, rosto e moto
// são também o que faz o cliente abrir a porta com sossego.
//
// Não há mapa nem localização aqui, e é de propósito: acompanhar o ponto
// se mexendo pede serviço de mapa pago, previsão de chegada honesta e o
// entregador sendo observado o tempo todo. O essencial -- quem é, em que
// chega, e um telefone -- não precisa de nada disso.

export function QuemEstaLevando({
  entregador,
}: {
  entregador: { nome: string; fotoUrl: string | null; moto: string | null; placa: string | null; telefone: string };
}) {
  const moto = [entregador.moto, entregador.placa].filter(Boolean).join(" · ");

  return (
    <Card className="flex items-center gap-4 border-success/40">
      {entregador.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- retrato pequeno, já recortado no envio
        <img src={entregador.fotoUrl} alt="" className="size-16 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-success/12 text-success">
          <Bike className="size-7" aria-hidden="true" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold text-success">
          <Bike className="size-4" aria-hidden="true" />
          Seu pedido está a caminho
        </p>
        <p className="text-lg font-extrabold">{entregador.nome}</p>
        {moto && <p className="text-sm text-muted">{moto}</p>}
      </div>

      {/* o telefone do entregador, para quando o portão não abre ou o
          prédio não tem campainha -- é a ligação que hoje passa pelo
          restaurante no meio do movimento */}
      <a
        href={`tel:+${entregador.telefone}`}
        aria-label={`Ligar para ${entregador.nome}`}
        className="grid size-12 shrink-0 place-items-center rounded-full bg-success/12 text-success transition-colors hover:bg-success/20"
      >
        <Phone className="size-5" aria-hidden="true" />
        <span className="sr-only">{formatPhone(entregador.telefone)}</span>
      </a>
    </Card>
  );
}
