import { describe, expect, it } from "vitest";

import {
  acharLinkDeMapa,
  lerMapa,
  lugarDaUrl,
  MARCA_LOCALIZACAO,
  mapaEmTexto,
  pontoDaUrl,
  pontoDoAviso,
} from "@/server/ia/localizacao";

// O mapa que o cliente manda, lido sem sair para a rede.
//
// Os endereços daqui são os formatos de verdade do Google Maps, que não
// são um só: o compartilhar do app, o pin solto, o lugar com nome, o
// encurtado. Errar a leitura de um deles faz a IA pedir o endereço de
// quem acabou de mandá-lo -- foi o erro do primeiro fim de semana dela.

describe("acharLinkDeMapa", () => {
  it("acha o encurtado no meio da frase", () => {
    expect(acharLinkDeMapa("é aqui ó https://maps.app.goo.gl/AbC123xyz")).toBe(
      "https://maps.app.goo.gl/AbC123xyz",
    );
  });

  it("tira a pontuação de fim de frase", () => {
    expect(acharLinkDeMapa("minha casa: https://maps.app.goo.gl/AbC123.")).toBe(
      "https://maps.app.goo.gl/AbC123",
    );
  });

  it("aceita o endereço longo do Google", () => {
    const url = "https://www.google.com/maps/place/Rua+Vit%C3%B3ria+R%C3%A9gia/@-2.03,-60.02,17z";
    expect(acharLinkDeMapa(`olha ${url} obrigado`)).toBe(url);
  });

  it("aceita maps.google.com com consulta", () => {
    expect(acharLinkDeMapa("https://maps.google.com/?q=-2.03,-60.02")).toBe(
      "https://maps.google.com/?q=-2.03,-60.02",
    );
  });

  it("ignora link do Google que não é mapa", () => {
    expect(acharLinkDeMapa("https://www.google.com/search?q=pizza")).toBeNull();
  });

  it("ignora link de outro lugar", () => {
    expect(acharLinkDeMapa("https://instagram.com/papaleguas")).toBeNull();
    expect(acharLinkDeMapa("https://maps.evil.com/?q=-2.03,-60.02")).toBeNull();
  });

  it("texto sem link nenhum não é mapa", () => {
    expect(acharLinkDeMapa("quero uma lasanha de frango")).toBeNull();
  });
});

describe("pontoDaUrl", () => {
  it("lê o ponto exato do parâmetro data, e prefere ele ao centro da tela", () => {
    const url =
      "https://www.google.com/maps/place/Casa/@-2.030000,-60.025000,17z/data=!3m1!4b1!4m2!3d-2.031111!4d-60.026222";
    expect(pontoDaUrl(url)).toEqual({ lat: -2.031111, lng: -60.026222 });
  });

  it("lê o pin solto da consulta", () => {
    expect(pontoDaUrl("https://maps.google.com/?q=-2.0304,-60.0251")).toEqual({
      lat: -2.0304,
      lng: -60.0251,
    });
  });

  it("lê a consulta com a vírgula escapada", () => {
    expect(pontoDaUrl("https://maps.google.com/?query=-2.0304%2C-60.0251")).toEqual({
      lat: -2.0304,
      lng: -60.0251,
    });
  });

  it("lê o pin que vem no caminho", () => {
    expect(pontoDaUrl("https://www.google.com/maps/place/-2.0304,-60.0251/@-2.03,-60.02,17z")).toEqual(
      { lat: -2.0304, lng: -60.0251 },
    );
  });

  it("cai no centro da tela quando não há nada melhor", () => {
    expect(pontoDaUrl("https://www.google.com/maps/@-2.030500,-60.025500,18z")).toEqual({
      lat: -2.0305,
      lng: -60.0255,
    });
  });

  it("endereço sem coordenada nenhuma não inventa ponto", () => {
    expect(pontoDaUrl("https://maps.app.goo.gl/AbC123")).toBeNull();
  });

  it("recusa coordenada fora da faixa", () => {
    expect(pontoDaUrl("https://maps.google.com/?q=-200.5,-60.0")).toBeNull();
  });
});

describe("lugarDaUrl", () => {
  it("lê o nome do lugar, com acento e tudo", () => {
    expect(
      lugarDaUrl("https://www.google.com/maps/place/Rua+Vit%C3%B3ria+R%C3%A9gia,+479/@-2.03,-60.02,17z"),
    ).toBe("Rua Vitória Régia, 479");
  });

  it("coordenada no lugar do nome não é nome", () => {
    expect(lugarDaUrl("https://www.google.com/maps/place/-2.0304,-60.0251/@-2.03,-60.02,17z")).toBeNull();
  });

  it("endereço sem /place não tem nome", () => {
    expect(lugarDaUrl("https://www.google.com/maps/@-2.03,-60.02,17z")).toBeNull();
  });
});

describe("pontoDoAviso", () => {
  it("acha latitude e longitude com os nomes de sempre", () => {
    expect(pontoDoAviso({ latitude: -2.0304, longitude: -60.0251 })).toEqual({
      lat: -2.0304,
      lng: -60.0251,
    });
  });

  it("acha fundo no aviso, e com os nomes curtos", () => {
    const aviso = { message: { locationMessage: { lat: "-2.0304", lng: "-60.0251" } } };
    expect(pontoDoAviso(aviso)).toEqual({ lat: -2.0304, lng: -60.0251 });
  });

  it("acha com os nomes que a Meta usa", () => {
    const aviso = { content: { degreesLatitude: -2.0304, degreesLongitude: -60.0251 } };
    expect(pontoDoAviso(aviso)).toEqual({ lat: -2.0304, lng: -60.0251 });
  });

  it("campo vazio em 0,0 não é localização", () => {
    expect(pontoDoAviso({ latitude: 0, longitude: 0 })).toBeNull();
  });

  it("mensagem de texto comum não tem ponto", () => {
    expect(pontoDoAviso({ text: "quero uma lasanha", messageType: "conversation" })).toBeNull();
  });

  it("latitude sem longitude não vira ponto", () => {
    expect(pontoDoAviso({ latitude: -2.0304 })).toBeNull();
  });
});

describe("lerMapa", () => {
  // Nenhum destes sai para a rede: ou não há link, ou não há coordenada
  // para traduzir. É o que faz o caso comum -- texto comum -- custar uma
  // expressão regular e nada mais.
  it("texto comum não é mapa", async () => {
    expect(await lerMapa({ texto: "quero uma lasanha de frango" })).toBeNull();
  });

  it("pin sem coordenada ainda é mapa, para a IA não pedir o que já veio", async () => {
    const mapa = await lerMapa({ texto: "[localização]", ehPin: true });
    expect(mapa).toEqual({ ponto: null, lugar: null, rua: null, bairro: null, cidade: null });
    expect(mapaEmTexto(mapa!, true)).toContain("Não deu para abrir");
  });
});

describe("mapaEmTexto", () => {
  it("escreve o que o mapa deu, marcado para a IA", () => {
    const texto = mapaEmTexto(
      {
        ponto: { lat: -2.030412, lng: -60.025133 },
        lugar: null,
        rua: "Rua Vitória Régia",
        bairro: "Galo da Serra",
        cidade: "Presidente Figueiredo",
      },
      true,
    );
    expect(texto).toContain("[MAPA]");
    expect(texto).toContain("mandou a localização pelo mapa");
    expect(texto).toContain("Rua Vitória Régia, Galo da Serra, Presidente Figueiredo");
    expect(texto).toContain("latitude -2.030412");
    expect(texto).toContain("longitude -60.025133");
    // o número da casa é o que o mapa nunca tem: a IA precisa saber disso
    expect(texto).toContain("não tem o número da casa");
  });

  it("diz que o link era do Google quando não foi o pin", () => {
    const texto = mapaEmTexto(
      { ponto: null, lugar: "Hotel Calleb", rua: null, bairro: null, cidade: null },
      false,
    );
    expect(texto).toContain("mandou um link do Google Maps");
    expect(texto).toContain("Hotel Calleb");
  });

  it("guarda o que o cliente escreveu junto do link", () => {
    // este texto substitui a mensagem do cliente no histórico: o que não
    // vier para cá se perde, e com ele o item que ele pediu na mesma frase
    const texto = mapaEmTexto(
      { ponto: null, lugar: null, rua: null, bairro: null, cidade: null },
      false,
      "é aqui ó https://maps.app.goo.gl/AbC123 e manda mais uma coca lata",
    );
    expect(texto).toContain("e manda mais uma coca lata");
    expect(texto).not.toContain("maps.app.goo.gl");
  });

  it("link sozinho não vira frase do cliente", () => {
    const texto = mapaEmTexto(
      { ponto: null, lugar: null, rua: null, bairro: null, cidade: null },
      false,
      "https://maps.app.goo.gl/AbC123",
    );
    expect(texto).not.toContain("Ele escreveu junto");
  });

  it("o resto curto demais também não vira frase", () => {
    const texto = mapaEmTexto(
      { ponto: null, lugar: null, rua: null, bairro: null, cidade: null },
      false,
      "ó https://maps.app.goo.gl/AbC123",
    );
    expect(texto).not.toContain("Ele escreveu junto");
  });

  it("o bilhete do pin não vira fala do cliente", () => {
    // o webhook monta a mensagem do pin como marcador + link; nada disso
    // foi escrito pelo cliente, e ecoar aquilo seria a IA lendo a própria
    // anotação como se fosse ele falando
    const texto = mapaEmTexto(
      { ponto: null, lugar: null, rua: null, bairro: null, cidade: null },
      true,
      `${MARCA_LOCALIZACAO} https://maps.google.com/?q=-2.03,-60.02 (o mapa veio com: "Rua X")`,
    );
    expect(texto).not.toContain("Ele escreveu junto");
    expect(texto).not.toContain("em vez de escrever o endereço]");
  });

  it("mapa que não abriu diz isso, e não finge endereço", () => {
    const texto = mapaEmTexto(
      { ponto: null, lugar: null, rua: null, bairro: null, cidade: null },
      false,
    );
    expect(texto).toContain("Não deu para abrir");
    expect(texto).not.toContain("latitude");
  });
});
