# Menu Fácil na TV

Aplicativo webOS que abre o cardápio do Menu Fácil em tela cheia numa
Smart TV LG. É um *hosted web app*: a TV carrega o site publicado, então
o cardápio muda no painel e a tela acompanha sem ninguém reinstalar nada.

## O que ele faz

- Abre o cardápio em tela cheia, sem barra da LG por cima.
- Enquanto o site não responde, mostra um recado em português e continua
  tentando sozinho, de 5 em 5 segundos.
- Botão **vermelho** do controle abre a tela de endereço, para apontar a
  TV para outro servidor. O endereço fica guardado entre uma aberta e outra.
- Volta a tentar sozinho quando a TV sai do cochilo ou a internet volta.

O endereço padrão é `https://menufacildelivery.com.br`, o mesmo do totem
(`totem-app/src/config.js`).

## Instalar na TV

Com o Developer Mode ligado na TV e o dispositivo já registrado
(veja a seção abaixo), a partir desta pasta:

```
ares-package .
ares-install ./app.menufacil.tv_0.0.1_all.ipk -d tvquarto
ares-launch app.menufacil.tv -d tvquarto
```

Para acompanhar erros enquanto desenvolve:

```
ares-inspect app.menufacil.tv -d tvquarto
ares-log -d tvquarto
```

## Registrar a TV (uma vez)

```
npm install -g @webos-tools/cli
ares-setup-device -a tvquarto -i "username=prisoner" -i "host=IP_DA_TV" -i "port=9922"
ares-setup-device -f tvquarto
ares-novacom --getkey -d tvquarto
ares-device -i -d tvquarto
```

O `--getkey` pede a passphrase que o app **Developer Mode** mostra na tela
da TV. O Developer Mode expira em cerca de 1000 horas; renove pelo botão
*Extend* dentro do app antes disso.

## Limites

O aplicativo roda na sandbox do Developer Mode, como usuário `prisoner`.
Ele **não** substitui a tela inicial do webOS nem inicia junto com a TV —
o webOS não expõe isso a aplicativos de terceiros. Para abrir, escolha o
Menu Fácil na fileira de apps da tela inicial.
