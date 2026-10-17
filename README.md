# SIMEAOBuddy

App de treino **low volume** (PWA) do Lucas e de até ~10 amigos. Feito para usar no celular, dentro da academia.
Substitui a planilha "PLANILHA AVANÇADO" e as fichas em PDF: programa em escada, ficha do dia com feeders
calculadas, timer de descanso, registro das séries e a planilha por microciclo.

- **Andamento:** veja o [`PROGRESSO.md`](PROGRESSO.md) (etapa atual, o que foi feito e as pendências).
- **Especificação:** pasta [`docs/`](docs/); as decisões do Lucas ficam em `docs/03-decisoes.md`.
- **Regras para o Claude Code:** [`CLAUDE.md`](CLAUDE.md).
- **Link https e login com Google:** [`DEPLOY.md`](DEPLOY.md).

## Tecnologia
Node.js 24 + Express · banco `node:sqlite` (um arquivo em `data/`) · HTML/CSS/JS puro, sem build · testes com `node --test`.

## Rodar num PC novo

1. Instale o **Node.js 24** e o **Git**.
2. Baixe o projeto e instale as dependências:
   ```
   git clone <endereço do repositório> C:\app-treinos
   cd C:\app-treinos
   npm install
   ```
3. **Banco de dados:** o banco real (`data/treino.db`) **não vai para o git**, porque tem os treinos e as contas. Escolha uma das opções:
   - **Levar os dados:** desligue o servidor no PC antigo (`parar.bat`) e copie a pasta `data/` inteira para `C:\app-treinos\data\` no PC novo.
   - **Começar do zero:** só rode o app. O banco é criado sozinho, com a biblioteca de exercícios e o modelo pronto. Depois crie o admin no PowerShell:
     ```
     $env:SENHA="sua-senha"; npm run criar-admin -- lucasimeao "Lucas Simeão"
     ```
4. Login com Google (opcional): copie `.env.exemplo` para `.env` e preencha as credenciais (veja `DEPLOY.md`). O `.env` também não vai para o git.
5. Ligue o app com dois cliques em `iniciar.bat`, ou rode `npm start`. Ele abre em http://localhost:3100.
6. (Opcional) Para ter o ícone na área de trabalho e o servidor ligando sozinho com o Windows:
   ```
   powershell -ExecutionPolicy Bypass -File instalar-atalhos.ps1
   ```

## Comandos
| Comando | O que faz |
|---|---|
| `npm start` | Sobe o servidor na porta 3100 e mostra o endereço para abrir no celular |
| `npm test` | Roda os testes |
| `npm run seed` | Cria/atualiza o banco de exemplo `data/exemplo.db` (não mexe no real) |
| `npm run criar-admin -- <usuario> "<nome>"` | Cria o admin ou troca a senha dele (a senha vai em `$env:SENHA`) |
| `iniciar.bat` | Instala o que faltar, sobe o servidor e abre o navegador |
| `parar.bat` | Desliga o servidor que está rodando escondido |

## Continuar com o Claude Code
Abra o Claude Code na pasta do projeto e escreva:
```
Leia o CLAUDE.md e o PROGRESSO.md e continue de onde paramos.
```

## Organização
```
server.js            liga o servidor (porta 3100, rede local)
src/app.js           monta o Express (rotas + arquivos da tela)
src/treino/          regras de treino (funções puras, também servidas ao navegador em /js/treino/)
src/routes/          API (auth, alunos, exercicios, programas, treinos)
src/db/              conexão, migrações numeradas, seed da biblioteca e do modelo
public/              telas (SPA com rotas por hash), CSS do tema, ícone
test/                testes (node --test)
docs/                especificação
```
