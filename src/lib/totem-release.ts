// Onde está o instalador do aplicativo do totem.
//
// Ao contrário do Menu Fácil para PC, este instalador **não mora dentro do
// site**. O arquivo tem quase 100 MB, e com os dois juntos em public/ a
// Vercel passou a recusar o deploy inteiro. O do totem fica no Blob (o
// mesmo lugar das fotos do sistema) e aqui guardamos só o endereço.
//
// Para publicar uma versão nova:
//  1. `cd totem-app && npm run dist`
//  2. subir `dist/MenuFacilTotem-Setup-<versão>.exe` para o Blob do projeto
//     (Vercel → Storage → menufacil-blob → Browse data → Upload)
//  3. colar o endereço em TOTEM_SETUP_URL e mudar TOTEM_APP_VERSION aqui.
//
// Sem endereço, o painel mostra "em preparo" em vez de um botão que levaria
// a lugar nenhum.

export const TOTEM_APP_VERSION = "0.1.0";

/** endereço público do instalador; vazio enquanto não estiver publicado */
export const TOTEM_SETUP_URL = "https://4ztpzq9cgqucptab.public.blob.vercel-storage.com/MenuFacilTotem-Setup-0.1.0.exe";

export const TOTEM_APP_DISPONIVEL = TOTEM_SETUP_URL.length > 0;
