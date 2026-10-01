// Onde está o aplicativo de impressão do totem.
//
// O totem em si virou web: é a página /totem/<slug>, aberta no navegador do
// tablet em modo quiosque. Não há mais aplicativo do totem para instalar.
//
// O que fica instalado no tablet é só o **Menu Fácil Print**: a ponte com a
// impressora térmica. Ele é o Print Fácil do computador, em Android --
// mesma API, mesmo pareamento por código, mesma impressão automática.
//
// O arquivo não mora dentro do site: um instalador de ~100 MB em public/ já
// fez a Vercel recusar o deploy inteiro. Ele fica no Blob do projeto, e aqui
// guardamos só o endereço.
//
// Para publicar uma versão nova:
//  1. o GitHub compila o APK sozinho (.github/workflows/menufacil-print.yml)
//  2. baixar o APK do resultado da execução
//  3. subir para o Blob (Vercel → Storage → menufacil-blob → Browse data)
//  4. colar o endereço em PRINT_APK_URL e mudar PRINT_APK_VERSION aqui
//
// Sem endereço, o painel mostra "em preparo" em vez de um botão que levaria
// a lugar nenhum.

export const PRINT_APK_VERSION = "0.1.0";

/** endereço público do APK; vazio enquanto não estiver publicado */
export const PRINT_APK_URL = "";

export const PRINT_APK_DISPONIVEL = PRINT_APK_URL.length > 0;

// ---- aplicativo antigo, do Windows -------------------------------------
//
// Fica registrado para quem já instalou: o programa continua funcionando e
// abrindo a mesma página do totem. Não é mais oferecido no painel.

export const TOTEM_WINDOWS_VERSION = "0.1.0";
export const TOTEM_WINDOWS_URL = "https://4ztpzq9cgqucptab.public.blob.vercel-storage.com/MenuFacilTotem-Setup-0.1.0.exe";
