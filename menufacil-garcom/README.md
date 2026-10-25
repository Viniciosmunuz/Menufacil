# Menu Fácil Garçom

O salão na mão do garçom, em tela cheia: a mesma página do site
(`/entrar` e, depois do login, `/garcom/<restaurante>`), sem barra de
endereço e com ícone próprio no aparelho.

Feito para a **maquininha Android** (Stone e semelhantes) e para o celular
do garçom. Não desenha nenhuma tela do salão: tudo que melhorar no site
aparece aqui sem atualizar o aplicativo.

## Como o garçom usa

1. Abre o aplicativo.
2. Digita o **CPF e a senha** que o dono cadastrou em Salão →
   Configuração geral → Garçons.
3. Cai nas mesas.

Não há pareamento nem código: quem prova quem é, é o próprio garçom. A
sessão fica no cookie e dura trinta dias, então ele digita a senha uma vez
e, no dia a dia, encontra as mesas já abertas.

## Gerar o APK

Pelo GitHub, sem instalar nada: o workflow
`.github/workflows/menufacil-garcom.yml` compila a cada mudança nesta
pasta e publica o arquivo numa release (`garcom-v1.0.0`).

Para compilar na máquina, com o Android Studio instalado:

```bash
cd menufacil-garcom
gradle assembleDebug
```

O APK sai em `app/build/outputs/apk/debug/app-debug.apk`.

## O que a Stone exige, e onde está cumprido

Da página de pré-requisitos da SDK Android da Stone
(sdkandroid.stone.com.br):

| Exigência | Como está |
|---|---|
| Android 6.0 (API 23) ou mais | minSdk 24 |
| Nome do pacote `br.com.Empresa.App.Campo`, sem citar a Stone nem modelos | `br.com.menufacil.garcom.salao` |
| Kotlin 2.0 ou mais | 2.0.21 |
| APK até 70 MB | 3,5 MB |
| HTTPS com TLS 1.2 | só menufacildelivery.com.br, e nada mais abre no aplicativo |
| Seção "Fale Conosco" visível | Ajustes → Fale conosco, no próprio site |
| Layout responsivo | a mesma página do celular, que já se vira em tela pequena |
| Assinado antes de instalar | o APK de depuração é assinado com a chave de teste; a de produção ainda não existe |

Modelos que a Stone lista como suportados: GPOS 700X, Positivo L400,
Positivo L300 e Sunmi P2-B.

## O que falta para a loja da Stone

O APK de hoje é o de **depuração**, assinado com a chave de teste do
Android: instala no aparelho liberando "fontes desconhecidas", e serve
para testar. Para publicar na loja ainda é preciso:

- **conta de desenvolvedor na Stone** e o processo de homologação deles;
- **assinatura de produção** (uma chave própria, guardada fora do
  repositório) e `assembleRelease` no lugar de `assembleDebug`;
- política de privacidade e os textos e imagens da ficha do aplicativo.

Pagar na maquininha e imprimir por ela são outro passo: exigem o SDK da
Stone, e não entram nesta versão.
