/* =========================================================================
   Linha do tempo do reel — 1080x1920, 30 fps, 56 s.

   Nada aqui depende do relógio: o render.mjs chama window.__seek(t) com o
   tempo de cada quadro e a tela monta aquele instante exato. É isso que
   deixa o vídeo sair igual toda vez, sem quadro perdido nem animação
   atropelada pela lentidão do navegador.

   O desenho segue o vídeo de referência: título à esquerda com a segunda
   parte em laranja, telas do aplicativo desenhadas em creme (não são fotos),
   emoji no lugar de foto de prato, balões ligados por tracejado laranja, e
   cartão laranja chapado para abrir e fechar.
   ========================================================================= */

const DURACAO = 55.81;
const XF = 0.32; // passagem de uma cena para a outra

/* ---------- contas de animação ---------- */
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const seg = (t, ini, dur) => clamp((t - ini) / dur);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeBack = (p) => {
  const c = 1.70158, c3 = c + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};
const mix = (a, b, p) => a + (b - a) * p;

function põe(el, { o = 1, y = 0, x = 0, s = 1 } = {}) {
  if (!el) return;
  el.style.opacity = String(o);
  el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
}
function entra(el, t, ini, dur = 0.55, dy = 38) {
  const p = easeOut(seg(t, ini, dur));
  põe(el, { o: p, y: mix(dy, 0, p) });
}
/** entrada de vários irmãos, um atrás do outro */
function fila(els, t, ini, passo = 0.14, dur = 0.5, dy = 30, dx = 0) {
  els.forEach((el, i) => {
    const p = easeOut(seg(t, ini + i * passo, dur));
    põe(el, { o: p, y: mix(dy, 0, p), x: mix(dx, 0, p) });
  });
}

/* ---------- desenhos ---------- */
const LOGO = `
<g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="452" cy="100" r="31" stroke-width="32" />
  <path d="M231 296A236 236 0 0 1 688 374" stroke-width="44" />
  <path d="M283 310A181 181 0 0 1 460 194" stroke-width="24" />
  <path d="M123 300H233" stroke-width="44" />
  <path d="M69 380H170" stroke-width="44" />
  <path d="M241 380H696" stroke-width="46" />
  <path d="M114 458H335" stroke-width="44" />
  <path d="M243 458V515" stroke-width="44" />
  <path d="M690 446L670 506" stroke-width="42" />
</g>
<path fill="currentColor" fill-rule="evenodd"
  d="M218 498H692V508A122 122 0 0 1 570 620H340A122 122 0 0 1 218 508ZM425 545H483A11 11 0 0 1 483 567H425A11 11 0 0 1 425 545Z" />`;
/* A arte oficial, quando esta em reel/logo.png, entra no lugar do vetor. O
   vetor do logo.tsx e a mesma silhueta redesenhada, sem o relevo -- serve de
   reserva para o render nao quebrar quando o arquivo nao esta la. */
const USA_PNG = new URLSearchParams(location.search).get("logo") === "png";
const lg = (cls = "") =>
  USA_PNG
    ? `<img class="lg ${cls}" src="logo.png" alt="" />`
    : `<svg class="lg ${cls}" viewBox="44 48 682 578" fill="none">${LOGO}</svg>`;
const CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4"
  stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
const WA = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.15-1.75-.86-2-.96-.28-.1-.48-.15-.68.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.79-1.67-2.09-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.08 3.18 5.04 4.35 2.46.97 2.96.78 3.5.73.53-.05 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.57-.35Z"/><path d="M12 2a10 10 0 0 0-8.54 15.2L2 22l4.93-1.42A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.1.89.9-3.03-.19-.31A8.2 8.2 0 1 1 12 20.2Z"/></svg>`;
const selo = (txt) => `<div class="selo"><span class="v">${CHECK}</span>${txt}</div>`;
const em = (e) => `<span class="emoji">${e}</span>`;

/** cabeçalho padrão: chip opcional, título em linhas, subtítulo */
const cabec = (linhas, sub, chip) =>
  (chip ? `<div class="chip">${chip}</div>` : "") +
  `<h1>${linhas.map((l) => `<span class="ln" style="display:block">${l}</span>`).join("")}</h1>` +
  (sub ? `<p class="sub">${sub}</p>` : "");

/* =========================================================================
   as cenas
   ========================================================================= */

const prato = (emoji, nm, ds, pr) => `
  <div class="ph-item"><div class="th">${em(emoji)}</div>
    <div><div class="nm">${nm}</div><div class="ds">${ds}</div><div class="pr">${pr}</div></div>
    <div class="mais">+</div></div>`;

const CENAS = [
  /* ---- 1. gancho ---- */
  { id: "s1", t: 0.0, html: `<div class="scene">${cabec(
      ["Ainda pagando", `<span class="o">comissão</span>`, "em cada pedido?"],
      `Tem um jeito mais fácil. ${em("👇")}`, "Dono de restaurante")}</div>` },

  /* ---- 2. cartão laranja de abertura ---- */
  { id: "s2", t: 3.85, html: `<div class="scene"><div class="bumper">
      ${lg()}<div class="marca">MenuFácil</div>
      <div class="tag">Receba pedidos direto do cliente,<br /><b>sem pagar comissão.</b></div>
    </div></div>` },

  /* ---- 3. link próprio ---- */
  { id: "s3", t: 7.4, html: `<div class="scene">${cabec(
      [`Link <span class="o">próprio</span>`], "Seu cardápio com logo, fotos e preços.")}
    <div class="palco"><div class="phone">
      <div class="ph-bar"><span>9:41</span><span>5G</span></div>
      <div class="ph-url">${em("🔒")} menufacildelivery.com.br/restaurante/sua-marca</div>
      <div class="ph-cover"></div><div class="ph-ava">${em("🍔")}</div>
      <div class="ph-nome">Sua Lanchonete</div>
      <div class="ph-meta"><b>● Aberto agora</b> · 30–45 min</div>
      <div class="ph-chips"><span class="on">Lanches</span><span>Pizzas</span><span>Porções</span><span>Bebidas</span></div>
      ${prato("🍔", "X-Bacon", "Pão brioche, blend 150g, bacon", "R$ 24,90")}
      ${prato("🍕", "Pizza Calabresa", "Grande, 8 fatias", "R$ 49,90")}
      ${prato("🍟", "Batata Frita", "Porção 400g", "R$ 14,90")}
      ${prato("🥤", "Refrigerante", "Lata 350ml", "R$ 6,00")}
    </div>
    <div class="callout" id="c-app" style="right:-10px;top:150px"><div class="balao">Sem baixar app</div></div>
    <div class="callout" id="c-cad" style="left:-10px;bottom:170px"><div class="balao">Sem cadastro</div></div>
    </div></div>` },

  /* ---- 4. zero por cento ---- */
  { id: "s4", t: 14.32, html: `<div class="scene meio" id="s4">
      <div class="zero">0%</div>
      <h2>de comissão<br />por pedido</h2>
      <div class="diz">O cliente paga direto pra você:</div>
      <div class="selos">${selo("Pix")}${selo("Cartão")}${selo("Dinheiro")}</div>
    </div>` },

  /* ---- 5. pedido sem erro ---- */
  { id: "s5", t: 18.25, html: `<div class="scene">${cabec(
      [`Pedido <span class="o">sem erro</span>`], "Tamanho, sabor e adicionais escolhidos antes de confirmar.")}
    <div class="palco"><div class="phone">
      <div class="ph-bar"><span>9:41</span><span>5G</span></div>
      <div class="op-tit">X-Bacon</div><div class="op-sub">Escolha as opções</div>
      <div class="op-lab">Tamanho <em>obrigatório</em></div>
      <div class="op-row">Simples <span>R$ 24,90</span></div>
      <div class="op-row on">Duplo <span>+ R$ 5,00</span><i class="bola"></i></div>
      <div class="op-lab">Observação</div>
      <div class="op-obs">sem cebola</div>
      <div class="op-add"><span>Adicionar</span><span>R$ 29,90</span></div>
    </div></div></div>` },

  /* ---- 6. aviso com som ---- */
  { id: "s6", t: 23.93, html: `<div class="scene">${cabec(
      ["Aviso na hora,", `<span class="o">com som</span> ${em("🔔")}`], "No celular, tablet ou computador.")}
    <div class="palco"><div class="painel">
      <div class="top"><div><b>Painel de pedidos</b><div class="st">● Loja aberta</div></div>
        <div class="sino">${em("🔔")}</div></div>
      <div class="ped"><span class="id">#0318</span><div><div class="nm">Maria S.</div>
        <div class="ds">Entrega · 2 itens</div></div>
        <div class="vl"><b>R$ 44,80</b><em>novo</em></div></div>
      <div class="ped"><span class="id">#0319</span><div><div class="nm">João P.</div>
        <div class="ds">Retirada · 3 itens</div></div>
        <div class="vl"><b>R$ 62,40</b><em>novo</em></div></div>
    </div></div></div>` },

  /* ---- 7. imprime sozinho ---- */
  { id: "s7", t: 28.25, html: `<div class="scene">${cabec(
      ["Imprime sozinho", `<span class="o">no balcão</span> ${em("🖨️")}`])}
    <div class="palco" style="justify-content:flex-start"><div class="imp">
      <div class="maq"><div class="slot"></div><div class="led"></div></div>
      <div class="papel">
        <div class="cab">${lg()}<div class="n">MenuFácil</div><div class="r">Sua Lanchonete</div></div>
        <div style="text-align:center;font-weight:700;margin-top:8px">PEDIDO #0318 · 12:58</div>
        <div class="hr"></div>
        <div class="li"><span>1x X-Bacon duplo</span><span>29,90</span></div>
        <div class="ob">obs: sem cebola</div>
        <div class="li"><span>1x Batata frita</span><span>14,90</span></div>
        <div class="hr"></div>
        <div class="tot"><span>TOTAL</span><span>R$ 44,80</span></div>
        <div>Pagto: Dinheiro</div>
        <div style="font-weight:700">Troco p/ 50,00: R$ 5,20</div>
        <div class="hr"></div>
        <div style="font-weight:700">ENTREGA</div><div>Maria S.</div><div>Rua das Flores, 123</div>
      </div>
      <div class="callout" style="left:544px;top:386px"><span class="tracejo"></span>
        <div class="balao">Itens <i>e valores</i></div></div>
      <div class="callout" style="left:544px;top:470px"><span class="tracejo"></span>
        <div class="balao">Observações</div></div>
      <div class="callout" style="left:544px;top:596px"><span class="tracejo"></span>
        <div class="balao">Troco calculado</div></div>
      <div class="callout" style="left:544px;top:712px"><span class="tracejo"></span>
        <div class="balao">Endereço</div></div>
    </div></div></div>` },

  /* ---- 8. cardápio na sua mão ---- */
  { id: "s8", t: 34.0, html: `<div class="scene">${cabec(
      ["Cardápio", `<span class="o">na sua mão</span>`], "Acabou? Marque como esgotado na hora.")}
    <div class="palco"><div class="toggles">
      <div class="lin"><span class="th">${em("🍔")}</span><div><div class="nm">X-Bacon</div>
        <div class="pr">R$ 24,90</div></div><div class="sw"></div></div>
      <div class="lin"><span class="th">${em("🍕")}</span><div><div class="nm">Pizza Calabresa</div>
        <div class="pr">R$ 49,90</div></div><div class="sw"></div></div>
      <div class="lin off"><span class="th">${em("🍧")}</span><div><div class="nm">Açaí 500ml</div>
        <div class="pr">R$ 22,00</div></div><span class="tag">esgotado</span><div class="sw"></div></div>
      <div class="lin"><span class="th">${em("🍟")}</span><div><div class="nm">Batata Frita</div>
        <div class="pr">R$ 14,90</div></div><div class="sw"></div></div>
    </div></div></div>` },

  /* ---- 9. plano Essencial ---- */
  { id: "s9", t: 38.1, html: `<div class="scene">${cabec(
      [`Quanto <span class="o">custa?</span>`], "Dois planos, sem comissão em nenhum dos dois.")}
    <div class="palco"><div class="plano">
      <div class="cab">${lg()}<div class="n">Plano Essencial</div>
        <div class="sel">sem comissão</div></div>
      <div class="preco"><span class="cif">R$</span><span class="n">100</span><span class="mes">/mês</span></div>
      <ul>
        <li><span class="v">${CHECK}</span>Cardápio digital com link próprio</li>
        <li><span class="v">${CHECK}</span>Pedido pronto no seu WhatsApp</li>
        <li><span class="v">${CHECK}</span>Painel de pedidos com aviso sonoro</li>
        <li><span class="v">${CHECK}</span>Impressão automática no balcão</li>
        <li><span class="v">${CHECK}</span>Montagem do cardápio feita por nós</li>
        <li><span class="v">${CHECK}</span>Suporte incluso, pelo WhatsApp</li>
      </ul>
    </div></div></div>` },

  /* ---- 10. plano 100% Delivery ---- */
  { id: "s10", t: 44.0, html: `<div class="scene">${cabec(
      [`O pedido <span class="o">todo aqui</span>`], "Já pago, sem sair para conversa nenhuma.")}
    <div class="palco"><div class="plano hi">
      <div class="cab">${lg()}<div class="n">100% Delivery</div>
        <div class="sel cheio">mais completo</div></div>
      <div class="preco"><span class="cif">R$</span><span class="n">180</span><span class="mes">/mês</span></div>
      <div class="herda">Tudo do Essencial, e mais:</div>
      <ul>
        <li><span class="v">${CHECK}</span>Cliente paga por Pix na hora, na própria tela</li>
        <li><span class="v">${CHECK}</span>O dinheiro cai direto na sua conta</li>
        <li><span class="v">${CHECK}</span>O pedido só vira comanda depois de pago</li>
        <li><span class="v">${CHECK}</span>Cliente acompanha cada passo do pedido</li>
        <li><span class="v">${CHECK}</span>Conversa com o cliente dentro do pedido</li>
      </ul>
    </div></div></div>` },

  /* ---- 11. cartão laranja de fechamento ---- */
  { id: "s11", t: 49.75, html: `<div class="scene"><div class="bumper">
      ${lg()}<div class="marca">MenuFácil</div>
      <h2>Comece a receber<br />pedidos em<br />poucos minutos.</h2>
      <div class="botao">Cadastrar meu restaurante →</div>
      <div class="site">menufacildelivery.com.br</div>
      <div class="fone"><span class="wa">${WA}</span>(92) 99913-0838</div>
    </div></div>` },
];

/* ---------- monta a tela ---------- */
document.getElementById("cenas").innerHTML = CENAS.map((c) => c.html).join("");

const palco = CENAS.map((c, i) => {
  const node = document.getElementById("cenas").children[i];
  node.style.zIndex = String(i + 1);
  const q = (sel) => node.querySelector(sel);
  const qa = (sel) => [...node.querySelectorAll(sel)];
  return {
    ...c, node, fim: CENAS[i + 1] ? CENAS[i + 1].t : DURACAO,
    chip: q(".chip"), linhas: qa("h1 .ln"), sub: q(".sub"),
    palco: q(".palco"),
    bumper: q(".bumper"),
    bumperFilhos: qa(".bumper > *"),
    phone: q(".phone"), painel: q(".painel"), imp: q(".imp"),
    plano: q(".plano"), toggles: q(".toggles"),
    itens: qa(".ph-item, .op-row, .op-obs, .op-add, .ped, .toggles .lin, .plano li"),
    callouts: qa(".callout"),
    sino: q(".sino"),
    zero: q(".zero"), h2: q("h2"), diz: q(".diz"), selos: qa(".selos .selo"),
    preco: q(".preco"), herda: q(".herda"), cabPlano: q(".plano .cab"),
  };
});

/* =========================================================================
   window.__seek(t): desenha o instante t
   ========================================================================= */
window.__seek = function (t) {
  for (const c of palco) {
    const dentro = t >= c.t - 0.001 && t < c.fim + XF;
    if (!dentro) { c.node.style.visibility = "hidden"; c.node.style.opacity = "0"; continue; }
    c.node.style.visibility = "visible";
    const aparece = easeInOut(seg(t, c.t, XF));
    const sai = easeInOut(seg(t, c.fim, XF));
    põe(c.node, {
      o: aparece * (1 - sai),
      y: mix(30, 0, aparece) + mix(0, -30, sai),
      s: mix(0.99, 1, aparece) * mix(1, 1.012, sai),
    });

    const lt = t - c.t;

    /* cartão laranja: tudo sobe junto, com leve atraso entre as partes */
    if (c.bumper) { fila(c.bumperFilhos, lt, 0.1, 0.16, 0.6, 40); continue; }

    /* cabeçalho de cena */
    if (c.chip) entra(c.chip, lt, 0.05, 0.5, 22);
    fila(c.linhas, lt, c.chip ? 0.2 : 0.05, 0.13, 0.55, 42);
    if (c.sub) entra(c.sub, lt, 0.05 + c.linhas.length * 0.13 + 0.1, 0.55, 26);

    const base = 0.3 + c.linhas.length * 0.1;

    /* o aparelho, o painel, a impressora ou o cartão do plano */
    for (const alvo of [c.phone, c.painel, c.imp, c.toggles, c.plano]) {
      if (!alvo) continue;
      const p = easeOut(seg(lt, base, 0.7));
      põe(alvo, { o: p, y: mix(64, 0, p), s: mix(0.95, 1, p) });
    }
    /* o miolo entra depois, linha por linha */
    fila(c.itens, lt, base + 0.45, 0.12, 0.45, 0, -22);
    fila(c.callouts, lt, base + 0.7, 0.16, 0.45, 0, -26);

    /* o sino do painel bate de leve */
    if (c.sino) {
      const b = lt > base + 0.7 ? 1 + 0.07 * Math.sin((lt - base) * 9) : 1;
      c.sino.style.transform = `scale(${b})`;
    }

    /* cena do 0% */
    if (c.zero) {
      const pz = easeBack(seg(lt, 0.1, 0.8));
      põe(c.zero, { o: clamp(seg(lt, 0.1, 0.35)), s: mix(0.5, 1, pz) });
      entra(c.h2, lt, 0.7, 0.55, 30);
      entra(c.diz, lt, 1.1, 0.5, 22);
      fila(c.selos, lt, 1.35, 0.14, 0.45, 24);
    }

    /* preço e "tudo do Essencial" dos planos */
    if (c.preco) {
      const pp = easeBack(seg(lt, base + 0.25, 0.7));
      põe(c.preco, { o: clamp(seg(lt, base + 0.25, 0.3)), s: mix(0.72, 1, pp) });
      entra(c.cabPlano, lt, base + 0.15, 0.5, 18);
      if (c.herda) entra(c.herda, lt, base + 0.5, 0.45, 16);
    }
  }
};

/* espera a fonte: sem isto o primeiro quadro sai com a fonte de reserva */
window.__pronto = (async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].filter((i) => !i.complete)
    .map((i) => new Promise((ok) => { i.onload = ok; i.onerror = ok; })));
  return true;
})();
window.__DURACAO = DURACAO;
window.__seek(Number(new URLSearchParams(location.search).get("t") || 0));
