import { cn } from "@/lib/cn";

// Marca do MenuFácil: a cúpula com as linhas de velocidade e a base em forma
// de celular, redesenhada em vetor a partir da logo oficial. Herda a cor por
// currentColor (laranja da marca por padrão).
//
// Uso: o ícone sozinho é a marca principal. Ícone + nome só onde é preciso
// dizer o nome (topo). Empilhada, com o nome embaixo, nas telas em que a
// marca é o cabeçalho da página -- a de entrar.

/**
 * O desenho do ícone, no sistema de coordenadas do viewBox 0 0 956 616.
 *
 * Trocado em 03/11/2026 pela logo modernizada. É a mesma marca de sempre
 * -- cúpula, linhas de velocidade e travessa --, com os traços
 * equilibrados e as três linhas de velocidade mais longas e melhor
 * distribuídas. O desenho ficou mais largo que o antigo (956x616 contra
 * 682x578), porque é para a esquerda que as linhas cresceram.
 *
 * É uma forma só, preenchida, e não traços com espessura: assim o ícone
 * não muda de peso quando encolhe, e `currentColor` pinta tudo de uma vez.
 * O risco da travessa e o furo do pegador são vazados pelo `evenodd`.
 *
 * A arte original tem o laranja em degradê e as linhas de velocidade
 * desaparecendo à esquerda. Aqui elas terminam em ponta redonda e cor
 * cheia: em 32 pixels, que é onde este ícone vive quase sempre, degradê
 * vira sujeira e ponta esmaecida some.
 */
export function LogoMark() {
  return <path fill="currentColor" fillRule="evenodd" d="M 626.216 12.019C608.501 16.660,593.186 28.905,586.082 44.108C581.704 53.477,579.556 63.163,580.480 69.375C581.570 76.713,583.236 83.435,584.660 86.250C585.425 87.763,585.818 89,585.532 89C582.098 89,555.539 95.091,544.179 98.484C456.297 124.731,380.810 191.294,352.474 267.524C346.439 283.760,346.320 284.434,348.551 289.782C352.559 299.393,360.834 303.493,374.860 302.819C388.562 302.160,395.928 297.241,399.603 286.295C402.117 278.810,411.446 261.130,419.684 248.239C476.137 159.903,586.086 115.045,690.960 137.561C771.881 154.935,840.501 218.081,865.104 297.816C870.122 314.075,876.103 345.230,874.513 346.821C874.139 347.194,759.908 347.725,620.667 348L367.500 348.500 363.455 350.666C361.230 351.857,357.577 354.820,355.337 357.250C343.644 369.936,347.502 391.438,362.681 398.177C366.720 399.970,376.318 400.035,645.803 400.099L924.743 400.166 929.849 397.970C949.905 389.342,951.200 359.795,931.952 349.976C928.336 348.131,928.256 347.961,927.600 340.798C917.792 233.563,846.803 142.003,743.673 103.572C732.181 99.289,713.371 93.812,703.716 91.937C698.214 90.869,697.059 90.325,697.606 89.060C702.291 78.222,703.305 74.082,703.377 65.500C703.684 28.876,664.784 1.914,626.216 12.019M636.500 49.207C617.413 55.879,620.817 80.690,640.976 81.829C652.606 82.486,659.936 76.817,660.791 66.505C661.817 54.133,648.842 44.893,636.500 49.207M619 149.658C544.018 156.890,480.645 193.532,440.576 252.822C433.157 263.801,422.483 283.797,420.061 291.253C416.768 301.395,426.249 310.339,436.906 307.146C442.079 305.597,444.500 302.637,449.422 291.854C458.996 270.877,470.109 254.923,487 237.909C526.940 197.679,579.591 176.144,638.300 176.026C647.301 176.008,651.901 175.583,653.800 174.595C664.795 168.874,664.526 155.043,653.329 150.364C650.277 149.089,629.360 148.658,619 149.658M173.177 231.180C157.445 234.696,155.085 257.353,169.694 264.609C175.612 267.549,329.388 267.549,335.306 264.609C350.385 257.119,347.533 234.639,331.056 231.105C324.470 229.693,179.524 229.762,173.177 231.180M60.500 293.486C59.950 293.679,57.786 294.123,55.690 294.475C47.645 295.823,41 304.655,41 314C41 323.232,47.512 331.962,55.690 333.693C60.667 334.747,325.333 334.747,330.310 333.693C344.451 330.700,349.960 310.984,339.689 300.131C332.928 292.987,344.212 293.520,195.500 293.318C121.800 293.218,61.050 293.293,60.500 293.486M27 370.926C8.137 374.788,4.540 399.268,21.500 408.356L25.500 410.500 165 410.500L304.500 410.500 308.500 408.356C315.647 404.526,319.143 398.662,319.143 390.500C319.143 382.338,315.647 376.474,308.500 372.644L304.500 370.500 167.500 370.355C92.150 370.275,28.925 370.532,27 370.926M905.267 419.996C892.075 422.781,889.365 426.197,876.709 456C864.867 483.885,863.245 487.224,859.325 491.791L856.500 495.081 629.814 495.110C466.914 495.131,402.551 494.830,401.075 494.040C398.531 492.678,396 487.946,396 484.550L396 482 450.318 482C511.109 482,511.742 481.938,519.132 475.262C533.364 462.404,528.753 436.913,511.321 432.072C506.100 430.622,192.038 430.584,186.823 432.033C162.623 438.754,160.877 473.540,184.388 480.523C188.585 481.769,201.257 482.001,265.432 482.007L341.500 482.014 341.584 494.257C341.946 546.680,382.596 590.474,442.700 603.194L453.500 605.480 613 605.782C773.420 606.085,787.096 605.849,803.500 602.494C845.521 593.898,883.807 565.344,902.040 529C906.323 520.464,935.931 447.660,937.219 442.500C940.909 427.713,924.259 415.987,905.267 419.996M588 535.930C578.697 537.790,574.847 544.661,578.635 552.643C581.671 559.041,581.352 559,628.416 559L670.930 559 674.355 555.993C681.063 550.104,679.781 540.618,671.788 536.990C667.768 535.165,665.126 535.050,629.500 535.137C608.600 535.188,589.925 535.545,588 535.930" />;
}

export function LogoIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 956 616"
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
  empilhada = false,
  className,
  iconClassName,
}: {
  /**
   * Ícone em cima e nome embaixo, os dois centrados -- em vez de lado a
   * lado. É a forma das telas que não têm mais nada em volta, como a de
   * entrar, onde a marca é o cabeçalho da página inteira.
   *
   * O slogan saiu daqui em 03/11/2026, a pedido dele: embaixo do nome ele
   * virava uma terceira linha de texto logo acima do cartão de entrada, e
   * a tela começava com três mensagens antes do primeiro campo.
   */
  empilhada?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn(empilhada ? "inline-flex flex-col items-center gap-2.5" : "inline-flex items-center gap-2.5", className)}>
      <LogoIcon className={cn(empilhada ? "h-14" : "h-8", iconClassName)} />
      <span className="text-2xl leading-none font-extrabold tracking-tight">
        Menu<span className="text-brand">Fácil</span>
      </span>
    </span>
  );
}
