const { contextBridge, ipcRenderer } = require("electron");

const { montarQuiosque } = require("./quiosque.cjs");

// A ponte entre a página e o processo principal.
//
// A página do cardápio (que é a mesma do site) não fala com o servidor do
// MenuFácil para cobrar nem com a impressora: ela pede aqui, e quem faz é o
// main.js. O token deste totem nunca chega ao navegador.

contextBridge.exposeInMainWorld("totemApp", {
  // usado pela tela de fechar o pedido, no site
  cobrar: (pedido) => ipcRenderer.invoke("totem:cobrar", pedido),
  conferirPagamento: (id) => ipcRenderer.invoke("totem:conferirPagamento", id),
  cancelarPagamento: (id) => ipcRenderer.invoke("totem:cancelarPagamento", id),
  imprimir: (via) => ipcRenderer.invoke("totem:imprimir", via),

  // usado pela tela local de entrar
  estado: () => ipcRenderer.invoke("totem:estado"),
  servidor: (endereco) => ipcRenderer.invoke("totem:servidor", endereco),
  entrar: (dados) => ipcRenderer.invoke("totem:entrar", dados),
  parear: (codigo) => ipcRenderer.invoke("totem:parear", codigo),
  abrirCardapio: () => ipcRenderer.invoke("totem:abrirCardapio"),

  // ajustes, atrás da senha
  impressoras: () => ipcRenderer.invoke("totem:impressoras"),
  escolherImpressora: (nome) => ipcRenderer.invoke("totem:escolherImpressora", nome),
  imprimirTeste: () => ipcRenderer.invoke("totem:imprimirTeste"),
  destravar: (senha) => ipcRenderer.invoke("totem:destravar", senha),
  travar: () => ipcRenderer.invoke("totem:travar"),
  fechar: () => ipcRenderer.invoke("totem:fechar"),
  desconectar: () => ipcRenderer.invoke("totem:desconectar"),
  recarregar: () => ipcRenderer.invoke("totem:recarregar"),
});

// O cadeado é desenhado pelo aplicativo, não pelo site: assim a página do
// cardápio não precisa saber que está rodando num totem, e o pontinho do
// canto aparece em qualquer tela que o totem abra.
montarQuiosque(ipcRenderer);
