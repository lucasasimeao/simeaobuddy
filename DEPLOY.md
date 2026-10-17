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
| "Login com Google ainda não configurado" | Falta o `.env` (Parte 2, item 6) ou o servidor não foi reiniciado |
| Esqueci a senha do admin | No PowerShell, dentro da pasta: `$env:SENHA="nova-senha"; npm run criar-admin -- lucasimeao "Lucas Simeão"` |

## Backup
O banco inteiro é o arquivo `data/treino.db`. Para fazer backup, desligue o servidor (`parar.bat`) e copie a pasta `data/`
para um lugar seguro (pendrive, Google Drive). O backup pelo próprio app chega na Etapa 7.
