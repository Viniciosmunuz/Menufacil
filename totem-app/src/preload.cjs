const { contextBridge, ipcRenderer } = require("electron");

// A ponte entre a tela e o processo principal.
//
// A tela do totem não fala com o servidor nem com a impressora: ela pede,
// e quem faz é o main.js. O token do aparelho nunca chega até aqui.

contextBridge.exposeInMainWorld("totem", {
  estado: () => ipcRenderer.invoke("totem:estado"),
  servidor: (endereco) => ipcRenderer.invoke("totem:servidor", endereco),

  entrar: (dados) => ipcRenderer.invoke("totem:entrar", dados),
  parear: (codigo) => ipcRenderer.invoke("totem:parear", codigo),

  cardapio: () => ipcRenderer.invoke("totem:cardapio"),

  cobrar: (pedido) => ipcRenderer.invoke("totem:cobrar", pedido),
  conferirPagamento: (id) => ipcRenderer.invoke("totem:conferirPagamento", id),
  cancelarPagamento: (id) => ipcRenderer.invoke("totem:cancelarPagamento", id),

  impressoras: () => ipcRenderer.invoke("totem:impressoras"),
  escolherImpressora: (nome) => ipcRenderer.invoke("totem:escolherImpressora", nome),
  imprimir: (via) => ipcRenderer.invoke("totem:imprimir", via),
  imprimirTeste: () => ipcRenderer.invoke("totem:imprimirTeste"),

  destravar: (senha) => ipcRenderer.invoke("totem:destravar", senha),
});
