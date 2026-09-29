// Versão do aplicativo do totem publicada no site.
//
// Mesma ideia do Menu Fácil para PC (src/lib/app-release.ts): o instalador
// fica em public/totem e publicar uma versão é copiar o arquivo para lá e
// mudar o número aqui.
//
// TODO: enquanto DISPONIVEL for false, o painel mostra "em preparo" no
// lugar do botão de baixar. Virar para true no dia em que o primeiro
// instalador for gerado a partir da pasta totem-app/.

export const TOTEM_APP_VERSION = "0.1.0";
export const TOTEM_APP_DISPONIVEL = false;

/** instalador da versão atual */
export const TOTEM_SETUP_PATH = `/totem/MenuFacilTotem-Setup-${TOTEM_APP_VERSION}.exe`;
