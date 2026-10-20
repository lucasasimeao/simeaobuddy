# App de Treino Low Volume: instruções para o Claude Code

## O que é
App web (PWA) de treino para o Lucas (admin/treinador) e até ~10 amigos (alunos). Uso pessoal, não comercial.
Treino **natural, low volume**, usado **no celular dentro da academia** (às vezes sem internet).
Substitui a planilha "PLANILHA AVANÇADO | VOCÊ ESTRUTURA" e as fichas em PDF do Lucas: tudo o que elas fazem, o app faz melhor e sem erros de fórmula.

## Com quem você fala
O Lucas não é programador profissional. Responda em **português do Brasil**, curto e simples.
Explique decisões em 1 a 2 frases e **sempre diga como testar** (no PC e no celular).

## Especificação: leia antes de mexer
Em caso de conflito, vale a ordem abaixo:
1. `docs/03-decisoes.md`: decisões do Lucas (prioridade máxima)
2. `docs/04-metodologia-treino.md`: o método de treino (tipos de série, feeders, escada, tonelagem, fadiga, fichas e vídeos)
3. `docs/05-requisitos.md`: regras de cálculo, telas, etapas e critérios de pronto
4. `docs/02-plano-do-app.md`: plano geral e modelo de dados
5. `docs/01-pesquisa-low-volume.md`: base científica (só para o que os outros não definem)
- Seed da biblioteca: `docs/exercicios-da-planilha.txt` (170 exercícios) + as fichas do `04` §5.

## Andamento
`PROGRESSO.md` guarda a etapa atual, o que foi feito e as pendências.
**Leia no início de toda sessão** e atualize ao fim de cada etapa.

## Tecnologia (não trocar sem perguntar)
- Node.js 24 (já instalado) + Express. Banco: **`node:sqlite`** (nativo, sem compilar nada), arquivo em `data/` (`process.env.DB_PATH`). Porta: `process.env.PORT` (padrão 3100; a 3000 é de outro projeto), escutando em `0.0.0.0` para o celular acessar pela rede.
- Frontend: HTML + CSS + JavaScript puro (ES modules), **sem build**, SPA com rotas por hash, servido pelo Express.
- PWA: manifest + service worker + IndexedDB (ficha do dia e fila offline de séries).
- Chart.js (gráficos), ExcelJS (exportar .xlsx), ícones Lucide em SVG inline.
- Login: admin único com usuário + senha (hash com `crypto.scrypt`); alunos com **Google** (OAuth sem bibliotecas, `src/auth/google.js`), cadastro fica `pendente` até o admin aprovar. Sessão em cookie httpOnly. Papéis `admin` e `aluno`. Segredos no `.env` (fora do git).
- Acesso externo: **Tailscale Funnel** (link https fixo para a porta 3100). Ver `DEPLOY.md`.
- Proibido sem pedir: React, TypeScript, bundlers, Docker, banco externo, CSS framework.

## Organização
- `src/treino/`: **todas as regras de treino como funções puras** (feeders, escada, tonelagem, progressão, fadiga, e1RM), com testes em `test/` (`node --test`). A tela e as rotas nunca calculam regra de treino por conta própria.
- `src/routes/`: rotas da API · `src/db/`: conexão e migrações numeradas (só aditivas) · `public/js/telas/`: uma tela por arquivo · `public/css/`: tema.
- Código, tabelas, rotas e textos da interface em português.

## Regras de trabalho
- **Uma etapa por vez** (lista em `docs/05` §Etapas). Antes de codar a etapa, mostre em até 10 linhas o que vai fazer.
- Ao fim de cada etapa: `npm test` passando → atualizar `PROGRESSO.md` → dizer como testar → **parar e esperar o "ok"**. Commit só depois do ok, mensagem em português.
- Faltou decisão? Use o padrão dos docs, marque `// DECIDIR:` no código e anote em `PROGRESSO.md` → Pendências.
- Não invente funcionalidade fora da especificação; sugira no fim da etapa.
- Valide os dados no servidor; mostre os erros com mensagens amigáveis.
- **Nunca apague nem recrie `data/`** (é o banco real com os treinos). Dados de exemplo só via `npm run seed` num banco separado (`data/exemplo.db`) ou quando o banco estiver vazio.
- Ao corrigir um bug numa regra de treino, adicione um teste que reproduz o bug.

## Visual
Tema preto, clean e moderno. Tokens em `:root` (nenhuma cor solta no código):
fundo `#0A0A0A` · superfícies `#141414` / `#1C1C1C` · borda `#262626` · texto `#FAFAFA` / `#A3A3A3` · destaque conforme `docs/03`.
Fonte Inter, números `tabular-nums`, cantos de 12 a 16px, quase sem sombra. Celular primeiro (360 a 430px), toque ≥ 48px, sem rolagem horizontal.
Detalhes em `docs/05` §Visual.

## Comandos
- `iniciar.bat` (duplo clique): instala o que faltar, sobe o servidor e abre o navegador.
- Ícone **SIMEAOBuddy** na área de trabalho (`abrir.vbs`): liga o servidor escondido, se estiver desligado, e abre o app. O servidor também liga sozinho com o Windows (atalho na pasta Inicializar). Log em `logs/servidor.log`.
- `npm run criar-admin -- <usuario> "<nome>"` com a senha em `$env:SENHA`: cria/troca a senha do admin.
- `instalar-atalhos.ps1`: cria os dois atalhos (`-Remover` tira). `parar.bat`: desliga o servidor escondido (necessário antes de atualizar o código).
- `npm start`: sobe o servidor (porta 3100). Mostra o endereço para abrir no celular.
- `npm test`: roda os testes (`node --test`, pasta `test/`).
- `npm run seed`: cria/atualiza o banco de exemplo `data/exemplo.db` (nunca mexe no real): admin `exemplo` / senha `exemplo123` e a aluna "Ana Exemplo" com 5 microciclos registrados.
- `testar-exemplo.bat`: desliga o servidor normal e liga o app no banco de exemplo (os .bat precisam de quebra de linha CRLF).
- Usar o banco de exemplo: no PowerShell, `$env:DB_PATH="data/exemplo.db"; npm start`.
- Fotos do Corpo: `data/fotos/<nome do banco>/<id da pessoa>/` (real em `data/fotos/treino/`, exemplo em `data/fotos/exemplo/`).
- Banco real: `data/treino.db`. Migrações em `src/db/migracoes/NNN_nome.sql` (só aditivas), aplicadas sozinhas ao iniciar.
