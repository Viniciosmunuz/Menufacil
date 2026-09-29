// O cadeado do totem, desenhado por cima de qualquer página que ele abra.
//
// Fica no preload de propósito: o cardápio é a página do site, e ela não
// precisa saber que está num totem. Assim o pontinho do canto e a tela de
// senha existem igual no cardápio, no fechamento do pedido e até numa tela
// de erro de internet.
//
// Como se sai daqui: um toque no pontinho apagado do canto de cima (ou a
// tecla M, para quem tem teclado ligado) pede a senha do painel. Quem
// confere a senha é o servidor.

const COR = {
  fundo: "#0a0e14",
  caixa: "#131922",
  linha: "#2a3441",
  texto: "#f2f5f9",
  apagado: "#9aa7b8",
  marca: "#ff8a1f",
  marcaTexto: "#1a0f02",
  perigo: "#ff5c5c",
};

function estilo(elemento, regras) {
  Object.assign(elemento.style, regras);
}

function botao(texto, tom) {
  const b = document.createElement("button");
  b.textContent = texto;
  estilo(b, {
    minHeight: "52px",
    padding: "0 20px",
    borderRadius: "12px",
    border: tom === "secundario" ? `1px solid ${COR.linha}` : "1px solid transparent",
    background: tom === "perigo" ? COR.perigo : tom === "secundario" ? "#1b232e" : COR.marca,
    color: tom === "secundario" ? COR.texto : tom === "perigo" ? "#fff" : COR.marcaTexto,
    font: "800 17px system-ui, 'Segoe UI', sans-serif",
    cursor: "pointer",
  });
  return b;
}

function montarQuiosque(ipcRenderer) {
  const pronto = () => {
    if (document.getElementById("mf-totem-canto")) return;

    // ---- o pontinho escondido do canto ----------------------------------
    const canto = document.createElement("button");
    canto.id = "mf-totem-canto";
    canto.setAttribute("aria-label", "Ajustes do totem");
    estilo(canto, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "56px",
      height: "56px",
      margin: "0",
      padding: "0",
      border: "0",
      background: "transparent",
      zIndex: "2147483000",
      display: "grid",
      placeItems: "center",
      cursor: "default",
    });
    const ponto = document.createElement("span");
    estilo(ponto, { width: "8px", height: "8px", borderRadius: "50%", background: COR.apagado, opacity: "0.22" });
    canto.appendChild(ponto);

    // ---- a tela da senha e dos ajustes ----------------------------------
    const fundo = document.createElement("div");
    estilo(fundo, {
      position: "fixed",
      inset: "0",
      background: COR.fundo,
      zIndex: "2147483001",
      display: "none",
      placeItems: "center",
      padding: "24px",
    });

    const caixa = document.createElement("div");
    estilo(caixa, {
      width: "min(460px, 100%)",
      background: COR.caixa,
      border: `1px solid ${COR.linha}`,
      borderRadius: "14px",
      padding: "22px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      font: "400 16px system-ui, 'Segoe UI', sans-serif",
      color: COR.texto,
    });

    const titulo = document.createElement("h2");
    titulo.textContent = "Área do restaurante";
    estilo(titulo, { margin: "0", font: "800 22px system-ui, 'Segoe UI', sans-serif" });

    const ajuda = document.createElement("p");
    ajuda.textContent = "Digite a senha do painel para destravar o totem.";
    estilo(ajuda, { margin: "0", color: COR.apagado, fontSize: "14px" });

    const senha = document.createElement("input");
    senha.type = "password";
    senha.autocomplete = "off";
    estilo(senha, {
      height: "52px",
      borderRadius: "12px",
      border: `1px solid ${COR.linha}`,
      background: "#1b232e",
      color: COR.texto,
      padding: "0 14px",
      fontSize: "17px",
      width: "100%",
    });

    const recado = document.createElement("p");
    estilo(recado, { margin: "0", minHeight: "20px", color: COR.perigo, font: "700 14px system-ui, sans-serif" });

    const linhaSenha = document.createElement("div");
    estilo(linhaSenha, { display: "flex", gap: "10px" });
    const voltar = botao("Voltar", "secundario");
    const destravar = botao("Destravar");
    estilo(voltar, { flex: "1" });
    estilo(destravar, { flex: "1" });
    linhaSenha.append(voltar, destravar);

    // ajustes, que só aparecem depois da senha
    const ajustes = document.createElement("div");
    estilo(ajustes, { display: "none", flexDirection: "column", gap: "10px" });

    const rotulo = document.createElement("label");
    rotulo.textContent = "Impressora da comanda";
    estilo(rotulo, { font: "700 14px system-ui, sans-serif", marginTop: "6px" });

    const impressoras = document.createElement("select");
    estilo(impressoras, {
      height: "52px",
      borderRadius: "12px",
      border: `1px solid ${COR.linha}`,
      background: "#1b232e",
      color: COR.texto,
      padding: "0 12px",
      fontSize: "16px",
      width: "100%",
    });

    const testar = botao("Imprimir via de teste", "secundario");
    const versao = document.createElement("p");
    estilo(versao, { margin: "0", color: COR.apagado, fontSize: "13px" });

    const separador = document.createElement("hr");
    estilo(separador, { border: "0", borderTop: `1px solid ${COR.linha}`, width: "100%", margin: "6px 0" });

    const atender = botao("Voltar ao atendimento", "secundario");
    const desconectar = botao("Desligar este totem do restaurante", "secundario");
    const fechar = botao("Fechar o totem", "perigo");

    ajustes.append(versao, rotulo, impressoras, testar, separador, atender, desconectar, fechar);
    caixa.append(titulo, ajuda, senha, recado, linhaSenha, ajustes);
    fundo.appendChild(caixa);
    document.body.append(canto, fundo);

    // ---- comportamento ---------------------------------------------------
    let destravado = false;

    function abrirSenha() {
      senha.value = "";
      recado.textContent = "";
      destravado = false;
      ajustes.style.display = "none";
      ajuda.style.display = "";
      senha.style.display = "";
      linhaSenha.style.display = "flex";
      titulo.textContent = "Área do restaurante";
      fundo.style.display = "grid";
      senha.focus();
    }

    function fecharTela() {
      fundo.style.display = "none";
      if (destravado) ipcRenderer.invoke("totem:travar");
      destravado = false;
    }

    canto.addEventListener("click", abrirSenha);

    document.addEventListener("keydown", (evento) => {
      if (evento.key !== "m" && evento.key !== "M") return;
      // a pessoa pode estar escrevendo o nome dela ou uma observação
      const alvo = document.activeElement;
      const escrevendo = alvo && (["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName) || alvo.isContentEditable);
      if (escrevendo || fundo.style.display === "grid") return;
      abrirSenha();
    });

    voltar.addEventListener("click", fecharTela);

    senha.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") destravar.click();
    });

    destravar.addEventListener("click", async () => {
      destravar.disabled = true;
      recado.textContent = "";
      const resposta = await ipcRenderer.invoke("totem:destravar", senha.value);
      destravar.disabled = false;
      senha.value = "";

      if (resposta.erro) {
        recado.textContent = resposta.erro;
        return;
      }

      destravado = true;
      titulo.textContent = "Ajustes do totem";
      ajuda.style.display = "none";
      senha.style.display = "none";
      linhaSenha.style.display = "none";
      ajustes.style.display = "flex";

      const [lista, info] = await Promise.all([
        ipcRenderer.invoke("totem:impressoras"),
        ipcRenderer.invoke("totem:estado"),
      ]);
      impressoras.innerHTML = "";
      const padrao = document.createElement("option");
      padrao.value = "";
      padrao.textContent = "Impressora padrão do Windows";
      impressoras.appendChild(padrao);
      for (const i of lista) {
        const opcao = document.createElement("option");
        opcao.value = i.nome;
        opcao.textContent = i.nome;
        opcao.selected = i.nome === info.impressora;
        impressoras.appendChild(opcao);
      }
      versao.textContent = `Versão ${info.versao} · ${info.restaurante?.nome ?? "sem restaurante"}`;
    });

    impressoras.addEventListener("change", async () => {
      await ipcRenderer.invoke("totem:escolherImpressora", impressoras.value);
      recado.style.color = COR.marca;
      recado.textContent = "Impressora salva.";
    });

    testar.addEventListener("click", async () => {
      const resposta = await ipcRenderer.invoke("totem:imprimirTeste");
      recado.style.color = resposta.erro ? COR.perigo : COR.marca;
      recado.textContent = resposta.erro ?? `Via de teste enviada para ${resposta.impressora ?? "a impressora padrão"}.`;
    });

    atender.addEventListener("click", async () => {
      fundo.style.display = "none";
      destravado = false;
      await ipcRenderer.invoke("totem:recarregar");
    });

    desconectar.addEventListener("click", async () => {
      const resposta = await ipcRenderer.invoke("totem:desconectar");
      if (resposta.erro) {
        recado.style.color = COR.perigo;
        recado.textContent = resposta.erro;
      }
    });

    fechar.addEventListener("click", async () => {
      const resposta = await ipcRenderer.invoke("totem:fechar");
      recado.style.color = COR.perigo;
      recado.textContent = resposta.erro ?? "Fechando...";
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pronto);
  else pronto();
}

module.exports = { montarQuiosque };
