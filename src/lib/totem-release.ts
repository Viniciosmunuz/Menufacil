// Onde está o aplicativo de impressão do totem.
//
// O totem em si virou web: é a página /totem/<slug>, aberta no navegador do
// tablet em modo quiosque. Não há mais aplicativo do totem para instalar.
//
// O que fica instalado no tablet é só o **Menu Fácil Print**: a ponte com a
// impressora térmica. Ele é o Print Fácil do computador, em Android --
// mesma API, mesmo pareamento por código, mesma impressão automática.
//
// O arquivo não mora dentro do site: um instalador grande em public/ já fez
// a Vercel recusar o deploy inteiro. O APK fica numa release do repositório,
// que o próprio GitHub publica depois de compilar
// (.github/workflows/menufacil-print.yml) -- e o endereço de release é
// aberto, sem conta nem login, que é o que o tablet precisa para baixar.
//
// Para publicar uma versão nova: subir versionName/versionCode em
// menufacil-print/app/build.gradle.kts e PRINT_APK_VERSION aqui. O GitHub
// compila no push e troca o arquivo da release sozinho.

export const PRINT_APK_VERSION = "0.1.0";

const REPO = "https://github.com/Viniciosmunuz/Menufacil";

/** a etiqueta da release e o nome do arquivo, iguais aos do workflow */
export const PRINT_APK_TAG = `print-v${PRINT_APK_VERSION}`;
export const PRINT_APK_FILE = `menufacil-print-${PRINT_APK_VERSION}.apk`;

/** endereço público do APK; vazio desliga o botão no painel */
export const PRINT_APK_URL = `${REPO}/releases/download/${PRINT_APK_TAG}/${PRINT_APK_FILE}`;

export const PRINT_APK_DISPONIVEL = PRINT_APK_URL.length > 0;

// ---- aplicativo antigo, do Windows -------------------------------------
//
// Fica registrado para quem já instalou: o programa continua funcionando e
// abrindo a mesma página do totem. Não é mais oferecido no painel.

export const TOTEM_WINDOWS_VERSION = "0.1.0";
export const TOTEM_WINDOWS_URL = "https://4ztpzq9cgqucptab.public.blob.vercel-storage.com/MenuFacilTotem-Setup-0.1.0.exe";
