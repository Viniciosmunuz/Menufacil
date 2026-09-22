import { cn } from "@/lib/cn";

// Marca do MenuFácil: a cúpula com as linhas de velocidade e a base em forma
// de celular, redesenhada em vetor a partir da logo oficial. Herda a cor por
// currentColor (laranja da marca por padrão).
//
// Uso: o ícone sozinho é a marca principal. Ícone + nome só onde é preciso
// dizer o nome (topo). A logo completa, com o slogan, fica para poucos
// lugares (tela de entrada).

/** os traços do ícone, no sistema de coordenadas original (viewBox 44 50 676 540) */
export function LogoMark() {
  return (
    <>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* pegador da cúpula */}
        <circle cx="452" cy="100" r="31" strokeWidth="30" />
        {/* cúpula e o brilho de dentro */}
        <path d="M231 300A233 233 0 0 1 685 375" strokeWidth="40" />
        <path d="M283 310A181 181 0 0 1 460 194" strokeWidth="22" />
        {/* linhas de velocidade e a borda da cúpula */}
        <path d="M123 300H231" strokeWidth="38" />
        <path d="M69 375H172" strokeWidth="38" />
        <path d="M239 375H693" strokeWidth="38" />
        <path d="M114 440H337" strokeWidth="38" />
        {/* laterais da base (o celular) */}
        <path d="M240 440V545" strokeWidth="40" />
        <path d="M630 532L655 428" strokeWidth="36" />
      </g>
      {/* fundo da base, com o botão do celular vazado */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M220 505H630L619 552Q612 585 578 585H252Q220 585 220 553ZM410 540H462A11 11 0 0 1 462 562H410A11 11 0 0 1 410 540Z"
      />
    </>
  );
}

export function LogoIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="44 50 676 540"
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
