// Tela de entrar do totem. Só aparece enquanto o aparelho não está ligado
// a um restaurante; depois disso, quem abre é o cardápio do site.

const $ = (id) => document.getElementById(id);

async function comecar() {
  const info = await window.totemApp.estado();
  $("servidor").value = info.servidor;
  // já pareado (o aplicativo abriu esta tela por engano): vai direto
  if (info.pareado) await window.totemApp.abrirCardapio();
}

$("botao-entrar").addEventListener("click", async () => {
  const botao = $("botao-entrar");
  botao.disabled = true;
  $("recado").textContent = "";

  const escolhido = $("escolha-restaurante").hidden ? null : $("restaurante").value;
  const resposta = await window.totemApp.entrar({
    email: $("email").value.trim(),
    senha: $("senha").value,
    restauranteId: escolhido,
  });
  botao.disabled = false;

  if (resposta.escolha) {
    // a conta cuida de mais de um restaurante: escolher qual e entrar de novo
    $("escolha-restaurante").hidden = false;
    $("restaurante").innerHTML = "";
    for (const r of resposta.escolha) {
      const opcao = document.createElement("option");
      opcao.value = r.id;
      opcao.textContent = r.nome;
      $("restaurante").appendChild(opcao);
    }
    $("recado").textContent = "Escolha o restaurante e entre de novo.";
    return;
  }
  if (resposta.erro) {
    $("recado").textContent = resposta.erro;
    return;
  }

  $("senha").value = "";
  await window.totemApp.abrirCardapio();
});

$("botao-parear").addEventListener("click", async () => {
  $("recado").textContent = "";
  const resposta = await window.totemApp.parear($("codigo").value.trim());
  if (resposta.erro) {
    $("recado").textContent = resposta.erro;
    return;
  }
  await window.totemApp.abrirCardapio();
});

$("botao-servidor").addEventListener("click", async () => {
  const resposta = await window.totemApp.servidor($("servidor").value);
  $("recado").textContent = resposta.erro ?? "Endereço salvo.";
});

comecar();
