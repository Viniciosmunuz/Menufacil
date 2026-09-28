// Versão do Menu Fácil para PC publicada no site.
//
// Os arquivos ficam em public/app: o instalador e o latest.yml que o
// programa lê para saber se saiu versão nova. Publicar uma versão é gerar
// o instalador, copiar os dois para lá e mudar o número aqui.

export const APP_VERSION = "1.3.0";

/** instalador da versão atual, dentro da pasta que o programa também consulta */
export const APP_SETUP_PATH = `/app/MenuFacil-Setup-${APP_VERSION}.exe`;
