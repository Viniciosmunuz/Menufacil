import React from "react";
import { Composition } from "remotion";
import { loadFont } from "@remotion/google-fonts/Nunito";
import { DURACAO_EM_SEGUNDOS, Explicacao } from "./Explicacao";
import { DURACAO_PAINEL, PainelDoDia } from "./Painel";
import { FPS } from "./marca";

// A Nunito é a fonte do sistema (src/app/globals.css). Carregada aqui, no
// topo, ela já está pronta quando o primeiro quadro é desenhado -- fonte
// que chega atrasada faz o render sair com a fonte errada.
loadFont();

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
