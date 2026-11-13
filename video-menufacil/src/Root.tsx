import React from "react";
import { Composition } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont } from "@remotion/google-fonts/Nunito";
import { Comercial, DURACAO_COMERCIAL } from "./Comercial";
import { DURACAO_EM_SEGUNDOS, Explicacao } from "./Explicacao";
import { DURACAO_LIA, Lia } from "./Lia";
import { DURACAO_LIAFALA, LiaFala } from "./LiaFala";
import { DURACAO_PAINEL, PainelDoDia } from "./Painel";
import { DURACAO_LINKEDIN, TecnicoLinkedIn } from "./TecnicoLinkedIn";
import { DURACAO_TUTORIAL, Tutorial } from "./Tutorial";
import { FPS } from "./marca";

// A Nunito é a fonte do sistema (src/app/globals.css). Carregada aqui, no
// topo, ela já está pronta quando o primeiro quadro é desenhado -- fonte
// que chega atrasada faz o render sair com a fonte errada.
loadFont();

// A JetBrains Mono é só do vídeo técnico, onde o código ocupa a tela
// inteira. Sem ela o render cai na mono do sistema, que muda de máquina
// para máquina -- e com isso muda onde cada linha de código quebra.
loadMono();

// A serifada italica do video em formato tutorial: e o contraste com a
// sans pesada que carrega aquele estilo.
loadSerif();

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* O comercial do sistema: papel claro, um aparelho em cena, sem
          voz. */}
      <Composition
        id="Comercial"
        component={Comercial}
        durationInFrames={Math.round(DURACAO_COMERCIAL * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* O comercial da Lia: a conversa acontecendo, bolha por bolha. */}
      <Composition
        id="Lia"
        component={Lia}
        durationInFrames={Math.round(DURACAO_LIA * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* A Lia se apresentando, na voz dela: primeira pessoa, rosto na
          tela o tempo todo. */}
      <Composition
        id="LiaFala"
        component={LiaFala}
        durationInFrames={Math.round(DURACAO_LIAFALA * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* O bastidor técnico, para o LinkedIn: quadrado, nas cores do
          sistema, com legenda. Os cortes escuros e o 9:16 que vieram
          antes dele foram substituídos por este. */}
      <Composition
        id="TecnicoLinkedIn"
        component={TecnicoLinkedIn}
        durationInFrames={Math.round(DURACAO_LINKEDIN * FPS)}
        fps={FPS}
        width={1080}
        height={1080}
      />
      {/* O passo a passo de fundo branco, no molde da referência que ele
          mandou: para o Instagram, mostrando os dois caminhos do pedido. */}
      <Composition
        id="Tutorial"
        component={Tutorial}
        durationInFrames={Math.round(DURACAO_TUTORIAL * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* O vídeo em estilo painel: cartões de vidro sobre a comida do
          Papaléguas, no jeito da referência que ele mandou. */}
      <Composition
        id="PainelDoDia"
        component={PainelDoDia}
        durationInFrames={Math.round(DURACAO_PAINEL * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* A primeira versão, chapada sobre fundo branco. Fica aqui porque
          serve para o site, onde o clima é outro. */}
      <Composition
        id="Explicacao"
        component={Explicacao}
        durationInFrames={Math.round(DURACAO_EM_SEGUNDOS * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
