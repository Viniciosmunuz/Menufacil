"use client";

import { useEffect, useState } from "react";

// Há quanto tempo o pedido está na mão do restaurante.
//
// É o número que diz se o movimento está indo bem ou se alguém esqueceu um
// pedido no balcão. Conta no navegador, de segundo em segundo: no servidor
// ele nasceria velho e só mudaria quando a página recarregasse.

const dois = (n: number) => String(n).padStart(2, "0");

export function Decorrido({ desde }: { desde: string }) {
  // o relógio é lido no efeito, não no desenho: desenhar tem de dar sempre
  // o mesmo resultado, e a hora muda a cada vez que alguém pergunta
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const segundos = Math.max(0, Math.floor((agora - new Date(desde).getTime()) / 1000));
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;

  // passou de um dia: contar as horas deixa de dizer alguma coisa
  const texto = h >= 24 ? `${Math.floor(h / 24)}d` : `${dois(h)}:${dois(m)}:${dois(s)}`;

  return (
    <span suppressHydrationWarning className="tabular-nums">
      {texto}
    </span>
  );
}
