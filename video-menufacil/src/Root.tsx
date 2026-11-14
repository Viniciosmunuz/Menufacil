import React from "react";
import { Composition, Still } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont } from "@remotion/google-fonts/Nunito";
import { Lamina2, Lamina3, Lamina4, Lamina5, Lamina6, QUADRO_DA_LAMINA } from "./Carrossel";
import { Comissao1, Comissao2, Comissao3, Comissao4, Comissao5, Comissao6 } from "./CarrosselComissao";
import { Whats1, Whats2, Whats3, Whats4, Whats5, Whats6 } from "./CarrosselWhatsapp";
import { Comercial, DURACAO_COMERCIAL, PostSistema } from "./Comercial";
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
      {/* A imagem de feed do Instagram sobre o sistema, feita das peças
          do comercial. Parada: sai com "remotion still PostSistema". */}
      <Still id="PostSistema" component={PostSistema} width={1080} height={1350} />
      {/* O terceiro carrossel: o restaurante que vende pelo WhatsApp, que
          é o caso de Presidente Figueiredo. Mesmo molde do da comissão. */}
      {[Whats1, Whats2, Whats3, Whats4, Whats5, Whats6].map((L, i) => (
        <Still key={i} id={`Whats${i + 1}`} component={L} width={1080} height={1350} />
      ))}
      {/* O segundo carrossel: a conta da comissão do aplicativo de
          delivery. Outro argumento e outra fonte; nada animado. */}
      {[Comissao1, Comissao2, Comissao3, Comissao4, Comissao5, Comissao6].map((L, i) => (
        <Still key={i} id={`Comissao${i + 1}`} component={L} width={1080} height={1350} />
      ))}
      {/* O carrossel: a capa é o PostSistema, e estas são as lâminas 2 a
          6. São composições porque usam as peças animadas do comercial;
          a lâmina é o quadro em que tudo já assentou. */}
      {[Lamina2, Lamina3, Lamina4, Lamina5, Lamina6].map((L, i) => (
        <Composition
          key={i}
          id={`Carrossel${i + 2}`}
          component={L}
          durationInFrames={QUADRO_DA_LAMINA + 1}
          fps={FPS}
          width={1080}
          height={1350}
        />
      ))}
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
