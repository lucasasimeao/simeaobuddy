# Progresso do app

**Etapa atual:** 1, Pessoas e login (não iniciada)

| Etapa | Nome | Status | Data | Observações |
|---|---|---|---|---|
| 0 | Base | ✅ | 17/10/2026 | Servidor, banco com migrações, tema, navegação, `iniciar.bat`, testes |
| 1 | Pessoas e login | ⬜ | | |
| 2 | Biblioteca de exercícios | ⬜ | | |
| 3 | Programa, escada e planilha | ⬜ | | |
| 4 | Ficha na academia | ⬜ | | |
| 5 | Progressão, tonelagem e fadiga | ⬜ | | |
| 6 | Corpo e gráficos | ⬜ | | |
| 7 | Exportar Excel e backup | ⬜ | | |
| 8 | PWA, offline e hospedagem | ⬜ | | |

Legenda: ⬜ não iniciada · 🔨 em andamento · 👀 esperando o teste do Lucas · ✅ aprovada (com commit)

## Feito
- **Decisões (17/10/2026):** os ❓ de `docs/03-decisoes.md` foram respondidos. Treino A–E; depois da S3, repetir o bloco (deload só com fadiga alta); Muscle Round 4×4; BO −20%; nome **SIMEAOBuddy**; destaque azul `#3B82F6` + roxo `#8B5CF6`.
- **Etapa 0:** Express 5 + `node:sqlite` (migração `001_base`: tabela `config`), `GET /api/saude`, SPA por hash (`public/js/app.js`, uma tela por arquivo em `public/js/telas/`), tema em `public/css/tema.css`, navegação inferior no celular e lateral no desktop (≥ 900px), `iniciar.bat`, 6 testes (banco + servidor). Git iniciado (commit depois do ok).

## Pendências / DECIDIR
- **Navegação do admin no celular:** as 4 telas do treinador (Alunos, Programas, Planilha, Biblioteca) ficam dentro de uma 5ª aba, "Gestão", para caber em 360px. No desktop elas aparecem direto na barra lateral. Por enquanto todo mundo vê essa aba; a partir da Etapa 1, só o admin. (`public/js/app.js`)
- A fonte Inter vem do Google Fonts; sem internet, usa a fonte do sistema. Na Etapa 8, o service worker guarda a fonte no celular.

## Como rodar
- **Jeito fácil:** ícone **SIMEAOBuddy** na área de trabalho. O servidor já liga sozinho quando o Windows inicia (sem janela). Para desligar: `parar.bat`. Para tirar o início automático: `powershell -ExecutionPolicy Bypass -File instalar-atalhos.ps1 -Remover`.
- PC: duplo clique em `iniciar.bat` (ou `npm start`) → http://localhost:3100
- Celular (mesma Wi-Fi): use o endereço "No celular" que aparece na janela preta (ex.: `http://192.168.0.109:3100`).
- Se o celular não abrir: libere o Node.js no firewall do Windows (na janela que aparece na 1ª vez, marque **Redes privadas** → Permitir).
