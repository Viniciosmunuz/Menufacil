// Avisos de pedido novo no celular do restaurante.
//
// Isto aqui não é a página do painel: é um programinha que o navegador
// guarda no aparelho e acorda sozinho quando o servidor manda um aviso.
// Por isso o apito funciona com o painel minimizado, com o navegador
// fechado e com a tela apagada — que é justamente o que a página sozinha
// não consegue fazer, porque o Android congela página que não está na
// frente.
//
// Ele não intercepta nada da navegação: só sabe receber aviso e abrir o
// painel quando alguém toca nele.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const PADRAO = {
  titulo: "Pedido novo",
  corpo: "Chegou um pedido no MenuFácil.",
  url: "/painel",
};

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    // aviso sem conteúdo legível: mostra o texto padrão, que é melhor do que nada
  }

  const url = dados.url || PADRAO.url;
  // "tem gente esperando" não pode parecer pedido novo: até 24/11/2026 os
  // dois chegavam com o mesmo ícone e a mesma vibração, e no balcão
  // confundiam os dois
  const atendimento = dados.estilo === "atendimento";
  event.waitUntil(
    self.registration.showNotification(dados.titulo || PADRAO.titulo, {
      body: dados.corpo || PADRAO.corpo,
      icon: atendimento ? "/icone-atendimento.png" : "/icone-192.png",
      badge: "/icone-192.png",
      // cada pedido tem a sua tag: dois pedidos seguidos aparecem como dois
      // avisos, e o mesmo pedido reenviado não vira aviso repetido
      tag: dados.tag || "pedido",
      renotify: true,
      // fica na tela até alguém tocar: pedido não pode passar batido
      requireInteraction: true,
      // Vibração própria para "tem gente esperando": uma longa e duas
      // curtas, contra as três iguais do pedido novo. Com o celular no
      // bolso, é por ela que dá para saber o que chegou sem olhar. O som
      // continua o mesmo nos dois -- foi decisão dele.
      vibrate: atendimento ? [500, 140, 120, 140, 120] : [220, 120, 220, 120, 220],
      actions: atendimento ? [{ action: "abrir", title: "Responder" }] : undefined,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || PADRAO.url;

  event.waitUntil(
    (async () => {
      const abas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // já tem o painel aberto em algum lugar: traz ele para a frente
      for (const aba of abas) {
        if (aba.url.includes("/painel")) {
          await aba.focus();
          if ("navigate" in aba) await aba.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
