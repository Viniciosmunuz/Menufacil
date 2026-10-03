import { cn } from "@/lib/cn";

// Marca do MenuFácil: a cúpula com as linhas de velocidade e a base em forma
// de celular, redesenhada em vetor a partir da logo oficial. Herda a cor por
// currentColor (laranja da marca por padrão).
//
// Uso: o ícone sozinho é a marca principal. Ícone + nome só onde é preciso
// dizer o nome (topo). A logo completa, com o slogan, fica para poucos
// lugares (tela de entrada).

/**
 * Os traços do ícone, no sistema de coordenadas do viewBox 44 48 682 578.
 *
 * Redesenhado em cima da arte oficial, medindo as duas lado a lado linha
 * por linha: a versão anterior tinha a base mais rasa, mais estreita e
 * puxada para a esquerda, e os traços uns 15% mais finos -- de longe
 * batia, de perto parecia outra marca.
 *
 * O relevo da arte não vem junto de propósito: em 32 pixels, que é o
 * tamanho em que este ícone vive na maior parte do tempo, bisel vira
 * sujeira. A silhueta é a mesma.
 */
export function LogoMark() {
  return (
    <>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* pegador da cúpula */}
        <circle cx="452" cy="100" r="31" strokeWidth="32" />
        {/* cúpula e o brilho de dentro */}
        <path d="M231 296A236 236 0 0 1 688 374" strokeWidth="44" />
        <path d="M283 310A181 181 0 0 1 460 194" strokeWidth="24" />
        {/* linhas de velocidade e a borda da cúpula */}
        <path d="M123 300H233" strokeWidth="44" />
        <path d="M69 380H170" strokeWidth="44" />
        <path d="M241 380H696" strokeWidth="46" />
        <path d="M114 458H335" strokeWidth="44" />
        {/* laterais da travessa */}
        <path d="M243 458V515" strokeWidth="44" />
        <path d="M690 446L670 506" strokeWidth="42" />
      </g>
      {/* o fundo da travessa, com o risco vazado */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M218 498H692V508A122 122 0 0 1 570 620H340A122 122 0 0 1 218 508ZM425 545H483A11 11 0 0 1 483 567H425A11 11 0 0 1 425 545Z"
      />
    </>
  );
}

export function LogoIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="44 48 682 578"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      // sem classe, 36px de altura; com classe, quem chama define o tamanho
      className={cn("w-auto shrink-0 text-brand", className ?? "h-9")}
    >
      <LogoMark />
    </svg>
  );
}

export function Logo({
  withSlogan = false,
  className,
  iconClassName,
}: {
  /** logo completa (ícone, nome e slogan): só em poucos lugares */
  withSlogan?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoIcon className={cn(withSlogan ? "h-12" : "h-8", iconClassName)} />
      <span className="flex flex-col leading-none">
        <span className="text-2xl font-extrabold tracking-tight">
          Menu<span className="text-brand">Fácil</span>
        </span>
        {withSlogan && (
          <span className="mt-1.5 text-sm font-medium text-muted">Seu cardápio, mais perto do cliente.</span>
        )}
      </span>
    </span>
  );
}
