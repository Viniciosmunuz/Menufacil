/* =========================================================================
   Linha do tempo do reel — 1080x1920, 30 fps, 45 s.

   Nada aqui depende do relógio: o render.mjs chama window.__seek(t) com o
   tempo de cada quadro e a tela monta aquele instante exato. É isso que
   deixa o vídeo sair igual toda vez, sem quadro perdido nem animação
   atropelada pela lentidão do navegador.
   ========================================================================= */

const DURACAO = 45.0;
const XF = 0.35; // tempo da passagem de uma cena para a outra

/* início de cada cena, em segundos. O fim de uma é o início da seguinte. */
const CENAS = [
  { el: "s1", t: 0.0 },
  { el: "s2", t: 4.0 },
  { el: "s3", t: 9.0 },
  { el: "s4", t: 18.0 },
  { el: "s5", t: 23.0 },
  { el: "s6", t: 32.0 },
  { el: "s7", t: 40.5 },
];

/* ---------- contas de animação ---------- */
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
/** andamento de 0 a 1 de um trecho que começa em `ini` e dura `dur` */
const seg = (t, ini, dur) => clamp((t - ini) / dur);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
/** passa um pouco do alvo e volta: dá peso ao que entra na tela */
const easeBack = (p) => {
  const c = 1.70158, c3 = c + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};
const mix = (a, b, p) => a + (b - a) * p;

/** aplica opacidade e transformação de uma vez */
function põe(el, { o = 1, y = 0, x = 0, s = 1, r = 0 } = {}) {
  if (!el) return;
  el.style.opacity = String(o);
  el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s}) rotate(${r}deg)`;
}
/** o jeito mais usado: sobe um pouco enquanto aparece */
function entra(el, t, ini, dur = 0.6, dy = 46) {
  const p = easeOut(seg(t, ini, dur));
  põe(el, { o: p, y: mix(dy, 0, p) });
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

const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICONES = {
  link: `<svg viewBox="0 0 24 24" ${S}><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><path d="M8 12h8"/></svg>`,
  percent: `<svg viewBox="0 0 24 24" ${S}><path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
  sino: `<svg viewBox="0 0 24 24" ${S}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2a10 10 0 0 0-2 5"/><path d="M20 2a10 10 0 0 1 2 5"/></svg>`,
  impressora: `<svg viewBox="0 0 24 24" ${S}><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>`,
  lista: `<svg viewBox="0 0 24 24" ${S}><path d="m3 7 2 2 4-4"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>`,
  chave: `<svg viewBox="0 0 24 24" ${S}><rect x="2" y="6" width="20" height="12" rx="6"/><circle cx="8" cy="12" r="2.6" fill="currentColor" stroke="none"/></svg>`,
};
const TICK = `<svg viewBox="0 0 24 24" ${S} stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>`;

/* ---------- conteúdo ---------- */
const BENEFICIOS = [
  { ic: "link", t: "Link próprio", d: "Seu cardápio com sua logo, suas fotos e seus preços." },
  { ic: "percent", t: "Sem comissão", d: "O cliente paga direto para você, por Pix, cartão ou dinheiro." },
  { ic: "sino", t: "Aviso com som", d: "Pedido novo apita no celular, no tablet ou no PC." },
  { ic: "impressora", t: "Imprime no balcão", d: "Sai na impressora com itens, endereço e troco calculado." },
  { ic: "lista", t: "Pedido sem erro", d: "Tamanho, sabor e adicional: o cliente confere antes de enviar." },
  { ic: "chave", t: "Cardápio na mão", d: "Acabou um prato? Marque esgotado e ele some na hora." },
];

const PRATOS = [
  { img: "smash-duplo", nm: "Smash Duplo", ds: "Dois hambúrgueres, queijo e molho da casa", pr: "R$ 32,90" },
  { img: "x-bacon", nm: "X-Bacon", ds: "Bacon crocante, queijo, alface e tomate", pr: "R$ 28,50" },
  { img: "batata-frita", nm: "Batata Frita", ds: "Porção grande com cheddar e bacon", pr: "R$ 19,90" },
  { img: "onion-rings", nm: "Onion Rings", ds: "Anéis de cebola empanados na hora", pr: "R$ 17,50" },
  { img: "isca-frango", nm: "Isca de Frango", ds: "Porção com molho especial da casa", pr: "R$ 24,00" },
  { img: "x-salada", nm: "X-Salada", ds: "O clássico, com salada fresca", pr: "R$ 22,00" },
  { img: "x-burger", nm: "X-Burger", ds: "Pão, carne, queijo e nada mais", pr: "R$ 18,00" },
];

/* os dois planos, com os mesmos textos da página de venda */
const PLANOS = [
  {
    alvo: "s5", nome: "Plano Essencial", preco: "R$ 100", periodo: "/mês",
    resumo: "O cardápio no link e o pedido chegando no seu WhatsApp.",
    itens: [
      "Cardápio digital com link próprio",
      "Pedido pronto no seu WhatsApp",
      "Painel de pedidos com aviso sonoro",
      "Impressão automática no balcão",
      "Montagem do cardápio feita por nós",
      "Suporte incluso: chamou, a gente atende",
      "Sem comissão por pedido",
    ],
  },
  {
    alvo: "s6", nome: "Plano 100% Delivery", preco: "R$ 180", periodo: "/mês",
    resumo: "O pedido inteiro dentro do sistema, já pago.",
    badge: "Mais completo", destaque: true, herda: "Tudo do Essencial, e mais:",
    itens: [
      "Cliente paga por Pix na hora, na própria tela",
      "O dinheiro cai direto na sua conta",
      "O pedido só vira comanda depois de pago",
      "Cliente acompanha cada passo do pedido",
      "Conversa com o cliente dentro do pedido",
      "Continua sem comissão: nem um centavo",
    ],
  },
];

/* ---------- monta a tela ---------- */
document.querySelectorAll('svg[viewBox="44 48 682 578"]').forEach((s) => (s.innerHTML = LOGO));

document.getElementById("s3-grid").innerHTML = BENEFICIOS.map(
  (b) => `<div class="card"><div class="ic">${ICONES[b.ic]}</div><h3>${b.t}</h3><p>${b.d}</p></div>`,
).join("");

document.getElementById("s4-scroll").innerHTML = PRATOS.map(
  (p) => `<div class="item">
      <img src="../../public/demo/burger/${p.img}.webp" alt="" />
      <div><div class="nm">${p.nm}</div><div class="ds">${p.ds}</div><div class="pr">${p.pr}</div></div>
    </div>`,
).join("");

for (const p of PLANOS) {
  document.getElementById(p.alvo).innerHTML = `
    <div class="plan${p.destaque ? " hi" : ""}">
      ${p.badge ? `<div class="badge">${p.badge}</div>` : ""}
      <div class="nome">${p.nome}</div>
      <div class="resumo">${p.resumo}</div>
      <div class="precorow"><span class="preco">${p.preco}</span><span class="periodo">${p.periodo}</span></div>
      <div class="semcom">Sem comissão por pedido · suporte incluso</div>
      ${p.herda ? `<div class="herda">${p.herda}</div>` : ""}
      <ul>${p.itens.map((i) => `<li><span class="tick">${TICK}</span><span>${i}</span></li>`).join("")}</ul>
    </div>`;
}

/* ---------- atalhos para o seek não procurar nada no meio do caminho ---------- */
const $ = (id) => document.getElementById(id);
const palco = {
  cenas: CENAS.map((c, i) => {
    const el = $(c.el);
    el.style.zIndex = String(i + 1);
    return { ...c, node: el, fim: CENAS[i + 1] ? CENAS[i + 1].t : DURACAO };
  }),
  marca: $("mark"),
  s1: { wedge: $("s1-wedge"), cut: $("s1-cut"), pie: document.querySelector("#s1 .pie"), l1: $("s1-l1"), l2: $("s1-l2") },
  s2: { eb: $("s2-eb"), zero: $("s2-zero"), t: $("s2-t"), s: $("s2-s") },
  s3: { t: $("s3-t"), cards: [...document.querySelectorAll("#s3-grid .card")] },
  s4: { t: $("s4-t"), phone: $("s4-phone"), scroll: $("s4-scroll"), cta: $("s4-cta") },
  planos: PLANOS.map((p) => {
    const raiz = $(p.alvo);
    return {
      card: raiz.querySelector(".plan"),
      badge: raiz.querySelector(".badge"),
      nome: raiz.querySelector(".nome"),
      resumo: raiz.querySelector(".resumo"),
      preco: raiz.querySelector(".precorow"),
      semcom: raiz.querySelector(".semcom"),
      herda: raiz.querySelector(".herda"),
      itens: [...raiz.querySelectorAll("li")],
    };
  }),
  s7: { lg: $("s7-lg"), t: $("s7-t"), s: $("s7-s"), wa: $("s7-wa"), site: $("s7-site") },
};

/* =========================================================================
   window.__seek(t): desenha o instante t
   ========================================================================= */
window.__seek = function (t) {
  /* --- quem está no ar, e a passagem entre cenas --- */
  for (const c of palco.cenas) {
    const dentro = t >= c.t - 0.001 && t < c.fim + XF;
    if (!dentro) {
      c.node.style.visibility = "hidden";
      c.node.style.opacity = "0";
      continue;
    }
    c.node.style.visibility = "visible";
    const aparece = easeInOut(seg(t, c.t, XF));
    const sai = easeInOut(seg(t, c.fim, XF));
    const o = aparece * (1 - sai);
    // o que entra vem de baixo; o que sai continua subindo, sem parar no meio
    const y = mix(34, 0, aparece) + mix(0, -34, sai);
    const s = mix(0.985, 1, aparece) * mix(1, 1.015, sai);
    põe(c.node, { o, y, s });
  }

  /* --- marca d'água: só nas cenas do meio --- */
  const m = seg(t, 9.0, 0.4) * (1 - seg(t, 40.5, 0.35));
  põe(palco.marca, { o: m * 0.92 });

  /* ================= 1. o aplicativo leva uma fatia ================= */
  {
    const lt = t - 0.0;
    const pin = easeOut(seg(lt, 0.1, 0.8));
    põe(palco.s1.pie, { o: pin, s: mix(0.86, 1, pin) });
    entra(palco.s1.l1, lt, 0.5, 0.6);
    // a fatia se solta: anda para fora e gira um tico
    const pw = easeInOut(seg(lt, 1.5, 0.9));
    põe(palco.s1.wedge, { o: 1, x: 86 * pw, y: -18 * pw, r: 7 * pw });
    const pc = easeBack(seg(lt, 2.0, 0.45));
    põe(palco.s1.cut, { o: clamp(seg(lt, 2.0, 0.3)), s: mix(0.6, 1, pc) });
    entra(palco.s1.l2, lt, 2.1, 0.6);
  }

  /* ================= 2. zero por cento de comissão ================= */
  {
    const lt = t - 4.0;
    entra(palco.s2.eb, lt, 0.1, 0.6, 24);
    const pz = easeBack(seg(lt, 0.4, 0.8));
    põe(palco.s2.zero, { o: clamp(seg(lt, 0.4, 0.35)), s: mix(0.45, 1, pz) });
    entra(palco.s2.t, lt, 1.0, 0.6);
    entra(palco.s2.s, lt, 1.4, 0.7);
  }

  /* ================= 3. benefícios ================= */
  {
    const lt = t - 9.0;
    entra(palco.s3.t, lt, 0.0, 0.6);
    palco.s3.cards.forEach((c, i) => {
      const p = easeOut(seg(lt, 0.7 + i * 0.75, 0.55));
      põe(c, { o: p, y: mix(54, 0, p), s: mix(0.95, 1, p) });
    });
  }

  /* ================= 4. o cardápio no celular ================= */
  {
    const lt = t - 18.0;
    entra(palco.s4.t, lt, 0.0, 0.6);
    const pp = easeOut(seg(lt, 0.3, 0.9));
    põe(palco.s4.phone, { o: pp, y: mix(72, 0, pp), s: mix(0.92, 1, pp) });
    // a lista desce devagar, como se alguém estivesse olhando o cardápio
    const ps = easeInOut(seg(lt, 0.9, 3.4));
    põe(palco.s4.scroll, { o: 1, y: -312 * ps });
    // o botão respira, para o olho cair nele
    const pulso = 1 + 0.03 * Math.sin((lt - 1.2) * 3.4);
    põe(palco.s4.cta, { o: clamp(seg(lt, 1.0, 0.5)), s: lt > 1.0 ? pulso : 0.9 });
  }

  /* ================= 5 e 6. os dois planos ================= */
  PLANOS.forEach((p, i) => {
    const lt = t - (i === 0 ? 23.0 : 32.0);
    const v = palco.planos[i];
    const passo = i === 0 ? 0.55 : 0.6;
    const pc = easeOut(seg(lt, 0.0, 0.6));
    põe(v.card, { o: pc, y: mix(40, 0, pc), s: mix(0.97, 1, pc) });
    if (v.badge) {
      const pb = easeBack(seg(lt, 0.3, 0.5));
      põe(v.badge, { o: clamp(seg(lt, 0.3, 0.3)), s: mix(0.5, 1, pb) });
    }
    entra(v.nome, lt, 0.25, 0.5, 20);
    entra(v.resumo, lt, 0.4, 0.5, 20);
    const pp = easeBack(seg(lt, 0.5, 0.7));
    põe(v.preco, { o: clamp(seg(lt, 0.5, 0.3)), s: mix(0.7, 1, pp) });
    entra(v.semcom, lt, 0.9, 0.5, 16);
    if (v.herda) entra(v.herda, lt, 0.95, 0.5, 16);
    v.itens.forEach((li, j) => {
      const q = easeOut(seg(lt, 1.05 + j * passo, 0.45));
      põe(li, { o: q, x: mix(-26, 0, q) });
    });
  });

  /* ================= 7. chamada final ================= */
  {
    const lt = t - 40.5;
    const pl = easeBack(seg(lt, 0.0, 0.8));
    põe(palco.s7.lg, { o: clamp(seg(lt, 0.0, 0.4)), s: mix(0.55, 1, pl) });
    entra(palco.s7.t, lt, 0.5, 0.6);
    entra(palco.s7.s, lt, 0.9, 0.6, 24);
    const pw = easeBack(seg(lt, 1.2, 0.6));
    const pulso = 1 + 0.028 * Math.sin((lt - 1.8) * 3.6);
    põe(palco.s7.wa, { o: clamp(seg(lt, 1.2, 0.35)), s: lt > 1.8 ? pulso : mix(0.7, 1, pw) });
    entra(palco.s7.site, lt, 1.6, 0.6, 18);
  }
};

/* espera fonte e foto: sem isto o primeiro quadro sai com a fonte de reserva */
window.__pronto = (async () => {
  await document.fonts.ready;
  const fotos = [...document.images].map((im) =>
    im.complete ? null : new Promise((ok) => { im.onload = ok; im.onerror = ok; }),
  );
  await Promise.all(fotos.filter(Boolean));
  return true;
})();

window.__DURACAO = DURACAO;
window.__seek(Number(new URLSearchParams(location.search).get("t") || 0));
