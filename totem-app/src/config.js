import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { app } from "electron";

// O que o totem guarda entre uma aberta e outra: o endereço do servidor, o
// token do aparelho e a impressora escolhida.
//
// Fica na pasta de dados do usuário, fora da pasta do programa: assim a
// atualização do aplicativo não apaga o pareamento do balcão.

const SERVIDOR_PADRAO = "https://menufacildelivery.com.br";

const arquivo = () => join(app.getPath("userData"), "totem.json");

export function lerConfig() {
  try {
    const bruto = readFileSync(arquivo(), "utf8");
    const dados = JSON.parse(bruto);
    return { servidor: SERVIDOR_PADRAO, token: null, impressora: null, restaurante: null, ...dados };
  } catch {
    return { servidor: SERVIDOR_PADRAO, token: null, impressora: null, restaurante: null };
  }
}

export function gravarConfig(mudancas) {
  const atual = lerConfig();
  const novo = { ...atual, ...mudancas };
  const caminho = arquivo();
  if (!existsSync(dirname(caminho))) mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, JSON.stringify(novo, null, 2), "utf8");
  return novo;
}

/** desliga este totem do restaurante (o dono pediu, ou o token não vale mais) */
export function esquecerPareamento() {
  return gravarConfig({ token: null, restaurante: null });
}
