// CPF: limpar, conferir e mostrar.
//
// O garçom entra com o CPF porque é o número que ele sabe de cor e não
// esquece -- diferente de um apelido inventado no dia do cadastro, que
// ninguém lembra duas semanas depois. Conferir os dígitos aqui evita o caso
// mais comum e mais chato: o dono erra um número no cadastro, entrega o
// login ao garçom, e os dois descobrem no meio do movimento que não entra.

export const soDigitos = (v: string) => v.replace(/\D/g, "");

/** "123.456.789-09" */
export function formatCpf(v: string) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Os dois dígitos do fim conferem com o resto do número.
 *
 * Também recusa os onze dígitos repetidos (111.111.111-11 e companhia):
 * eles passam na conta dos verificadores, mas não são CPF de ninguém --
 * são o que sai quando alguém segura a tecla para preencher o campo.
 */
export function cpfValido(v: string) {
  const d = soDigitos(v);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const digito = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}
