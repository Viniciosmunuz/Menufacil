/* ============================================================
   Menu Fácil na TV
   O aplicativo tem uma função só: abrir o cardápio em tela cheia e
   sair da frente. Enquanto o site não responde, a TV mostra um recado
   em português em vez da tela de erro do navegador, que ninguém no
   salão sabe o que fazer com ela.
   ============================================================ */

// O mesmo padrão do totem (totem-app/src/config.js).
const ENDERECO_PADRAO = "https://menufacildelivery.com.br";
const CHAVE = "menufacil.tv.endereco";

// Botões do controle remoto da LG. Números do webOS, não inventados:
// o vermelho é o atalho de manutenção, o voltar fecha a tela de ajuste.
const TECLA_VERMELHA = 403;
const TECLA_VOLTAR = 461;

const TEMPO_LIMITE = 8000;
const ESPERA_ENTRE_TENTATIVAS = 5000;

const telas = {
  abrindo: document.getElementById("tela-abrindo"),
  semInternet: document.getElementById("tela-sem-internet"),
  endereco: document.getElementById("tela-endereco"),
};

const campo = document.getElementById("endereco");
const recado = document.getElementById("recado");

let tentativa = null;

/** guarda o endereço entre uma aberta e outra; se nunca foi ajustado, usa o padrão */
function lerEndereco() {
  try {
    return localStorage.getItem(CHAVE) || ENDERECO_PADRAO;
  } catch {
    return ENDERECO_PADRAO;
  }
}

function gravarEndereco(valor) {
  try {
    localStorage.setItem(CHAVE, valor);
  } catch {
    /* TV sem armazenamento: vale só nesta aberta */
  }
}

function mostrar(qual) {
  for (const [nome, tela] of Object.entries(telas)) {
    tela.hidden = nome !== qual;
  }
}

/** o endereço precisa ser https: a TV recusa conteúdo misto e o cardápio pede câmera e pagamento */
function validar(bruto) {
  const limpo = (bruto || "").trim();
  if (!limpo) return { erro: "Digite o endereço do cardápio." };
  if (!/^https?:\/\//.test(limpo)) return { erro: "O endereço precisa começar com https://" };
  try {
    return { endereco: new URL(limpo).href };
  } catch {
    return { erro: "Esse endereço não parece certo. Confira e tente de novo." };
  }
}

/**
 * Bate no site antes de entregar a tela a ele. A resposta vem opaca
 * (outro domínio), e tudo bem: o que interessa é se a rede chegou lá.
 */
async function respondendo(endereco) {
  const desistir = new AbortController();
  const relogio = setTimeout(() => desistir.abort(), TEMPO_LIMITE);
  try {
    await fetch(endereco, { mode: "no-cors", cache: "no-store", signal: desistir.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(relogio);
  }
}

async function entrar() {
  clearTimeout(tentativa);
  const endereco = lerEndereco();
  mostrar("abrindo");

  if (await respondendo(endereco)) {
    location.href = endereco;
    return;
  }

  // Sem resposta: avisa e continua tentando sozinho, sem ninguém mexer na TV.
  mostrar("semInternet");
  tentativa = setTimeout(entrar, ESPERA_ENTRE_TENTATIVAS);
}

function abrirAjuste() {
  clearTimeout(tentativa);
  campo.value = lerEndereco();
  recado.textContent = "";
  mostrar("endereco");
  campo.focus();
}

document.getElementById("botao-salvar").addEventListener("click", () => {
  const { endereco, erro } = validar(campo.value);
  if (erro) {
    recado.textContent = erro;
    return;
  }
  gravarEndereco(endereco);
  entrar();
});

document.getElementById("botao-cancelar").addEventListener("click", entrar);

document.addEventListener("keydown", (evento) => {
  if (evento.keyCode === TECLA_VERMELHA) {
    abrirAjuste();
    return;
  }
  if (evento.keyCode === TECLA_VOLTAR && !telas.endereco.hidden) {
    entrar();
  }
});

// A TV volta de um cochilo ou a internet volta sozinha: tenta de novo na hora.
window.addEventListener("online", entrar);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !telas.semInternet.hidden) entrar();
});

entrar();
