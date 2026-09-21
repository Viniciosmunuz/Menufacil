import { cn } from "@/lib/cn";

// Cúpula de restaurante em traço, como na referência. Herda a cor por
// currentColor, então o mesmo desenho serve no laranja e no branco.
export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 40"
      fill="none"
      aria-hidden="true"
      className={cn("h-9 w-auto text-brand", className)}
    >
      <circle cx="24" cy="6.6" r="2.3" stroke="currentColor" strokeWidth="2.4" />
      <path d="M24 9v2.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M7.5 26.5a16.5 16.5 0 0 1 33 0"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M12 19.5h24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M4.5 27h39" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M9.5 31.2c3.8 3 8.8 4.5 14.5 4.5s10.7-1.5 14.5-4.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  withSlogan = false,
  sloganClassName,
  className,
}: {
  withSlogan?: boolean;
  /** para esconder o slogan em telas pequenas */
  sloganClassName?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoIcon className={withSlogan ? "h-11" : "h-9"} />
      <span className="flex flex-col leading-none">
        <span className="text-2xl font-extrabold tracking-tight">
          Menu<span className="text-brand">Fácil</span>
        </span>
        {withSlogan && (
          <span className={cn("mt-1 text-xs font-medium text-muted", sloganClassName)}>
            Seu cardápio, mais perto do cliente
          </span>
        )}
      </span>
    </span>
  );
}
