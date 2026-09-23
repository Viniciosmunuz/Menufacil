/** nuvem em cima de uma impressora: o Print Fácil, que recebe o pedido pela internet */
export function CloudPrinterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* nuvem */}
      <path d="M8.2 7.6a3.2 3.2 0 0 1 6.2-.9 2.4 2.4 0 0 1-.4 4.8H8.6a2.5 2.5 0 0 1-.4-3.9Z" />
      {/* corpo da impressora */}
      <path d="M5 16.5v-1.2a1.5 1.5 0 0 1 1.5-1.5h11a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H17" />
      {/* papel saindo */}
      <path d="M8 17h8v4.2H8z" />
      <path d="M6.6 16.4h.01" />
    </svg>
  );
}
