// Gera public/totem/demonstracao.html: o totem rodando no navegador, com
// cardápio de exemplo, sem servidor, sem maquininha e sem impressora.
//
// Serve para duas coisas: ver como o totem ficou sem instalar nada, e
// mostrar para um restaurante o que ele vai receber.
//
// O arquivo é montado a partir de renderer/index.html, renderer/estilo.css
// e renderer/app.js -- os mesmos do aplicativo de verdade. Mexeu na tela do
// totem, rode de novo:
//
//   node totem-app/gerar-demonstracao.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const renderer = join(aqui, "renderer");
const saida = join(aqui, "..", "public", "totem", "demonstracao.html");

// O que o aplicativo de verdade pede ao servidor, aqui vem de mentira. Este
// trecho não entra no instalador: é só desta página.
const MOCK = `
function qrFalso() {
  const lado = 21;
  const tela = document.createElement("canvas");
  tela.width = tela.height = lado * 8;
  const ctx = tela.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, tela.width, tela.height);
  ctx.fillStyle = "#000";
  let semente = 7;
  const sorte = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) if (sorte() > 0.5) ctx.fillRect(x * 8, y * 8, 8, 8);
  }
  for (const [cx, cy] of [[0, 0], [lado - 7, 0], [0, lado - 7]]) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx * 8, cy * 8, 7 * 8, 7 * 8);
    ctx.fillStyle = "#000";
    ctx.fillRect(cx * 8, cy * 8, 7 * 8, 8);
    ctx.fillRect(cx * 8, (cy + 6) * 8, 7 * 8, 8);
    ctx.fillRect(cx * 8, cy * 8, 8, 7 * 8);
    ctx.fillRect((cx + 6) * 8, cy * 8, 8, 7 * 8);
    ctx.fillRect((cx + 2) * 8, (cy + 2) * 8, 3 * 8, 3 * 8);
  }
  return tela.toDataURL("image/png").split(",")[1];
}

// as fotos vêm do site, como no totem de verdade
const FOTO = (arquivo) => location.origin + "/implantacao/papaleguas/" + arquivo;

const CATEGORIAS = [
  { id: "c1", nome: "Grelhados", produtos: [
    { id: "p1", nome: "Contra filé", descricao: "Arroz branco, batata frita e salada.", foto: FOTO("file-de-carne.webp"), destaque: true, preco_centavos: 3400, grupos: [
      { id: "g1", nome: "Ponto da carne", minimo: 1, maximo: 1, opcoes: [
        { id: "o1", nome: "Ao ponto", preco_centavos: 0 },
        { id: "o2", nome: "Bem passada", preco_centavos: 0 },
        { id: "o3", nome: "Mal passada", preco_centavos: 0 },
      ] },
      { id: "g2", nome: "Adicionais", minimo: 0, maximo: 3, opcoes: [
        { id: "o4", nome: "Ovo", preco_centavos: 300 },
        { id: "o5", nome: "Bacon", preco_centavos: 600 },
        { id: "o6", nome: "Queijo", preco_centavos: 400 },
      ] },
    ] },
    { id: "p2", nome: "Filé de frango", descricao: "Arroz, feijão e fritas.", foto: FOTO("file-de-frango.webp"), destaque: false, preco_centavos: 2900, grupos: [] },
    { id: "p3", nome: "Picanha na chapa", descricao: "Serve duas pessoas.", foto: FOTO("picanha.webp"), destaque: true, preco_centavos: 7900, grupos: [] },
    { id: "p4", nome: "Frango a passarinho", descricao: "Com mandioca frita e vinagrete.", foto: FOTO("frango-passarinho.webp"), destaque: false, preco_centavos: 4500, grupos: [] },
  ] },
  { id: "c2", nome: "Lanches", produtos: [
    { id: "p5", nome: "Bauru", descricao: "Pão, queijo derretido, presunto e tomate.", foto: FOTO("bauru.webp"), destaque: false, preco_centavos: 1800, grupos: [] },
    { id: "p6", nome: "Misto quente", descricao: "O de sempre, bem prensado.", foto: FOTO("misto.webp"), destaque: false, preco_centavos: 1400, grupos: [] },
    { id: "p11", nome: "Sanduíche natural", descricao: "Frango desfiado e salada.", foto: FOTO("sanduiche-natural.webp"), destaque: false, preco_centavos: 1600, grupos: [] },
  ] },
  { id: "c3", nome: "Porções", produtos: [
    { id: "p7", nome: "Calabresa acebolada", descricao: "Serve duas pessoas.", foto: FOTO("calabresa.webp"), destaque: false, preco_centavos: 2800, grupos: [] },
    { id: "p8", nome: "Filé de pirarucu", descricao: "Com arroz e farofa.", foto: FOTO("file-de-pirarucu.webp"), destaque: true, preco_centavos: 5200, grupos: [] },
  ] },
  { id: "c4", nome: "Bebidas", produtos: [
    { id: "p9", nome: "Suco de lata", descricao: null, foto: FOTO("suco-lata.webp"), destaque: false, preco_centavos: 700, grupos: [] },
    { id: "p10", nome: "Suco detox", descricao: "Copo de 400 ml", foto: FOTO("suco-detox.webp"), destaque: false, preco_centavos: 1000, grupos: [] },
    { id: "p12", nome: "Água tônica", descricao: null, foto: FOTO("agua-tonica.webp"), destaque: false, preco_centavos: 600, grupos: [] },
  ] },
];

// na demonstração o pagamento aprova sozinho depois de uns segundos
let aprovaEm = 0;

window.totem = {
  estado: async () => ({
    servidor: "https://menufacildelivery.com.br",
    restaurante: { id: "r1", nome: "Papaléguas", slug: "papaleguas" },
    impressora: "Tomate MTI-773",
    pareado: true,
    versao: "demonstração",
  }),
  servidor: async () => ({ ok: true }),
  entrar: async () => ({ ok: true, restaurante: { nome: "Papaléguas" } }),
  parear: async () => ({ ok: true, restaurante: { nome: "Papaléguas" } }),
  cardapio: async () => ({
    restaurante: { id: "r1", nome: "Papaléguas", logo: null, aberto: true, pedido_minimo_centavos: 0, papel_mm: 80 },
    categorias: CATEGORIAS,
  }),
  cobrar: async ({ forma, itens }) => {
    aprovaEm = Date.now() + 12000;
    const total = itens.reduce((s, i) => s + i.quantity * 1000, 0) || 4300;
    return {
      pagamento_id: "demo",
      forma,
      total_centavos: total,
      pix: forma === "pix" ? { copia_e_cola: "00020126...", imagem_base64: qrFalso() } : undefined,
    };
  },
  conferirPagamento: async () => {
    if (Date.now() < aprovaEm) return { situacao: "esperando" };
    return { situacao: "aprovado", pedido: { numero: 42 } };
  },
  cancelarPagamento: async () => ({ ok: true }),
  impressoras: async () => [{ nome: "Tomate MTI-773", padrao: true }, { nome: "Microsoft Print to PDF", padrao: false }],
  escolherImpressora: async () => ({ ok: true }),
  imprimir: async () => ({ ok: true, impressora: "Tomate MTI-773" }),
  imprimirTeste: async () => ({ ok: true, impressora: "Tomate MTI-773" }),
  destravar: async (senha) => (senha ? { ok: true } : { erro: "Digite a senha do painel." }),
  travar: async () => ({ ok: true }),
  fechar: async () => ({ ok: true }),
};
`;

// Um aviso discreto, só nesta página: quem abrir precisa saber que nada aqui
// cobra nem imprime de verdade.
const AVISO = `
<div id="aviso-demo">Demonstração · nada aqui cobra ou imprime de verdade</div>
<style>
  #aviso-demo {
    position: fixed;
    right: 8px;
    top: 8px;
    z-index: 200;
    padding: 6px 14px;
    border-radius: 999px;
    background: rgb(26 32 44 / 0.9);
    border: 1px solid var(--line);
    color: var(--muted);
    font-size: 12px;
    pointer-events: none;
  }
  /* no navegador o cursor precisa existir */
  html, body { cursor: auto; }
</style>
`;

let html = readFileSync(join(renderer, "index.html"), "utf8");
const css = readFileSync(join(renderer, "estilo.css"), "utf8");
const app = readFileSync(join(renderer, "app.js"), "utf8");

// a política de segurança do aplicativo proíbe script embutido; nesta página
// tudo é embutido, para ela ser um arquivo só
html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\s*/, "");
html = html.replace('<link rel="stylesheet" href="estilo.css" />', `<style>\n${css}\n</style>`);
html = html.replace('<script src="app.js"></script>', `<script>\n${MOCK}\n</script>\n<script>\n${app}\n</script>`);
html = html.replace("</body>", `${AVISO}</body>`);
html = html.replace("<title>Menu Fácil Totem</title>", "<title>Menu Fácil Totem · demonstração</title>");

mkdirSync(dirname(saida), { recursive: true });
writeFileSync(saida, html, "utf8");
console.log(`public/totem/demonstracao.html gerado (${(html.length / 1024).toFixed(1)} KB)`);
