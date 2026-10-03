---
name: Execução Expo no Replit
description: Condições necessárias para abrir este app Expo pelo Expo Go em um ambiente Replit.
---

O Expo Go precisa receber um endereço de túnel público; `localhost` ou `127.0.0.1` só funcionam dentro do ambiente de desenvolvimento. O Metro também deve ignorar `.local`, porque arquivos auxiliares ausentes nessa pasta podem interromper o observador de arquivos.

**Why:** O ambiente Replit é remoto em relação ao celular, e o Expo pode tentar observar arquivos de suporte temporários que não existem mais. Com `--web`, o Expo CLI também pode tentar abrir um navegador com `xdg-open`, indisponível no workflow headless, e falhar depois de conectar o túnel.

Em um iPhone físico, Expo Go e Expo CLI precisam estar autenticados na mesma conta Expo para abrir um projeto servido pelo servidor de desenvolvimento. Essa exigência não se aplica ao Android.

**Why:** A validação de conta é imposta pelo Expo Go no iOS físico para projetos de desenvolvimento; não é o login do próprio app.

**How to apply:** Ao ajustar a execução mobile, use o modo de túnel do Expo, preserve a exclusão de `.local` na configuração do Metro e defina `BROWSER=none` no workflow web. Se o Expo Go no iPhone mostrar a exigência de conta, autentique CLI e Expo Go com a mesma conta e toque em “Try Again”.