# Como colocar o SIMEAOBuddy no ar (link https + login com Google)

O app roda no seu PC. O **Tailscale Funnel** cria um link https fixo e grátis
(ex.: `https://seu-pc.tail1234.ts.net`) que funciona no celular de qualquer lugar,
desde que o PC esteja ligado. O login com Google exige esse link https.

---

## Parte 1: Tailscale (link https)

O Tailscale já está instalado (ícone perto do relógio do Windows).

1. Clique no ícone do Tailscale → **Log in** e entre com a sua conta Google (é grátis).
2. Abra o PowerShell e rode:
   ```
   tailscale funnel --bg 3100
   ```
   - Na primeira vez, ele mostra um link para **ativar o Funnel e o HTTPS** na sua conta. Abra o link, clique em ativar e rode o comando de novo.
   - No fim, ele mostra o seu link, algo como `https://desktop-xxxx.tail1234.ts.net`. **Guarde esse link**: é o endereço do app.
3. O `--bg` deixa o link ligado para sempre, mesmo depois de reiniciar o PC.
   - Ver como está: `tailscale funnel status`
   - Desligar o link: `tailscale funnel --https=443 off`

> Quer um nome mais bonito? No painel do Tailscale (login.tailscale.com → Machines) você pode renomear a máquina, por exemplo para `simeaobuddy`.

---

## Parte 2: Login com Google (credenciais)

1. Entre em **https://console.cloud.google.com** com a sua conta Google.
2. Crie um projeto: menu de projetos → **Novo projeto** → nome `SIMEAOBuddy` → Criar.
3. Menu → **APIs e serviços → Tela de permissão OAuth** (ou "Google Auth Platform"):
   - Nome do app: `SIMEAOBuddy`; e-mail de suporte: o seu.
   - Público: **Externo**.
   - Contato do desenvolvedor: o seu e-mail → Salvar.
   - Em **Público**, clique em **Publicar app** (assim qualquer amigo consegue entrar; o app só pede nome, e-mail e foto, então o Google não exige verificação).
4. Menu → **Clientes** (ou "Credenciais") → **Criar cliente** → tipo **Aplicativo da Web**:
   - Nome: `SIMEAOBuddy`
   - **URIs de redirecionamento autorizados**, adicione os dois:
     - `http://localhost:3100/api/auth/google/retorno`
     - `https://SEU-LINK.ts.net/api/auth/google/retorno` (o link da Parte 1)
   - Criar.
5. Vão aparecer o **ID do cliente** e a **Chave secreta do cliente**.
6. Na pasta `C:\app-treinos`, copie o arquivo `.env.exemplo` com o nome `.env` e preencha:
   ```
   GOOGLE_CLIENT_ID=o-id-que-apareceu.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=a-chave-secreta
   ```
   O `.env` **não vai para o git** (é segredo).
7. Reinicie o servidor: dois cliques em `parar.bat` e depois no ícone **SIMEAOBuddy**.

---

> **Se o Google não deixar publicar** (fica em "Testar app"): tudo bem. Em **Público → Usuários de teste → Adicionar usuários**,
> coloque o Gmail de cada amigo (até 100). Só entra quem estiver nessa lista: **a cada amigo novo, adicione o Gmail dele lá antes**.
> (É o caso do Lucas desde 21/10/2026.)

---

## Parte 3: Passar para os amigos

- Mande o link `https://SEU-LINK.ts.net`.
- Eles tocam em **Entrar com Google** e ficam "aguardando aprovação".
- Você libera em **Alunos → Aguardando → Aprovar** (no celular: aba **Gestão → Alunos**).

---

## Problemas comuns

| Problema | Solução |
|---|---|
| Google mostra "redirect_uri_mismatch" | O link na Parte 2, item 4, tem que ser **igual** ao do Tailscale, terminando em `/api/auth/google/retorno` |
| O link https não abre | O PC está ligado? O servidor está rodando (ícone SIMEAOBuddy)? Rode `tailscale funnel status` |
| Não aparece "Instalar app" no celular | Abra pelo link **https** (Tailscale), não pelo endereço da Wi-Fi |
| "Login com Google ainda não configurado" | Falta o `.env` (Parte 2, item 6) ou o servidor não foi reiniciado |
| Esqueci a senha do admin | No PowerShell, dentro da pasta: `$env:SENHA="nova-senha"; npm run criar-admin -- admin "Lucas Simeão"` |

## Parte 4: Instalar no celular (vira um app)

Use sempre o **link https** da Parte 1. Pelo endereço da Wi-Fi (`http://192.168...`) o app abre, mas o navegador
**não deixa instalar nem funcionar sem internet** (regra dos navegadores: só com https).

- **Android (Chrome):** abra o link → menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** abra o link → botão Compartilhar → **Adicionar à Tela de Início**.

O ícone SIMEAOBuddy aparece na tela do celular e o app abre em tela cheia, sem a barra do navegador.

### APK para Android (gerado em 29/10/2026)

Também existe um **APK** (`android/pacote/SIMEAOBuddy.apk`), feito no PWABuilder a partir do link https.
É uma "casca" que abre o app em tela cheia: o app continua rodando no PC (precisa do servidor e do Tailscale ligados).

- **Passar para alguém:** mande o `SIMEAOBuddy.apk` pelo WhatsApp ou Drive. No celular, ao abrir o arquivo,
  o Android pede para liberar "instalar apps desta fonte": libere e instale.
- **Mudanças no app não precisam de APK novo:** o APK só aponta para o link. Só gere outro se mudar o link,
  o nome ou o ícone.
- **Pacote:** `com.simeaobuddy.app`. O celular confere `/.well-known/assetlinks.json` (arquivo `android/assetlinks.json`,
  servido pelo `src/app.js`); se esse arquivo sumir, o app abre com a barra de endereço em cima.
- **Chave de assinatura:** `android/chave/` (`signing.keystore` + `signing-key-info.txt` com as senhas). **Não vai para o git.**
  Guarde uma cópia no Google Drive: sem ela, não dá para lançar versão nova do mesmo app (nem na Play Store).
- **APK novo:** pwabuilder.com → link https → Package For Stores → Google Play → "Package ID" `com.simeaobuddy.app`,
  aumente a versão em All Settings e, em "Signing key", escolha **Use mine** com os dados de `android/chave/`.
- `android/pacote/SIMEAOBuddy.aab` é o arquivo para a Play Store (conta de desenvolvedor: US$ 25 uma vez), se um dia quiser.

---

## Sem internet na academia

- Abra a ficha do treino **com internet** (em casa ou na entrada). Depois disso, se a internet cair, ela continua abrindo.
- Série salva sem internet: fica verde, aparece um **reloginho** nela e **"1 para enviar"** no topo.
  Ela sobe sozinha quando a internet volta (pode fechar o app; na próxima vez que abrir, ele envia).
- Dá para **finalizar** o treino sem internet: o resumo aparece quando a internet voltar.
- Precisa de internet: começar um treino novo, trocar exercício, descartar treino, ver gráficos atualizados.
- **Não saia da conta** com séries para enviar (o app avisa).

---

## Atualizar o app

Depois de mudar o código: `parar.bat` e depois o ícone **SIMEAOBuddy**.
O celular pega a versão nova sozinho na próxima vez que abrir o app (nunca no meio de uma ficha).

---

## Backup

- **Pelo app:** Gestão → **Backup** → "Baixar backup" (um .json com tudo, menos as fotos). Guarde no Google Drive.
  Para voltar um backup: mesma tela → Restaurar (o app guarda antes uma cópia do banco em `data/backups/`).
- **Cópia completa (com as fotos):** desligue o servidor (`parar.bat`) e copie a pasta `data/` inteira para um pendrive ou Drive.
