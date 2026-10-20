# Progresso do app

**Etapa atual:** 6, Corpo e grÃ¡ficos (esperando o teste do Lucas). Etapas 4 e 5 aprovadas em 20/10/2026.

| Etapa | Nome | Status | Data | ObservaÃ§Ãµes |
|---|---|---|---|---|
| 0 | Base | âœ… | 17/10/2026 | Servidor, banco com migraÃ§Ãµes, tema, navegaÃ§Ã£o, `iniciar.bat`, testes |
| 1 | Pessoas e login | âœ… | 17/10/2026 | Admin com senha, alunos com Google + aprovaÃ§Ã£o, anamnese, permissÃµes, Tailscale |
| 2 | Biblioteca de exercÃ­cios | âœ… | 17/10/2026 | 180 exercÃ­cios (170 da planilha + 10 sÃ³ das fichas), busca, filtro, ediÃ§Ã£o |
| 3 | Programa, escada e planilha | âœ… | 17/10/2026 | Modelo Aâ€“E com a escada, editor, contador por mÃºsculo, planilha (estrutura) |
| 4 | Ficha na academia | âœ… | 20/10/2026 | Hoje (sequÃªncia), ficha completa, timer, troca, resumo, planilha com dados |
| 5 | ProgressÃ£o, tonelagem e fadiga | âœ… | 20/10/2026 | Status ðŸŸ¢ðŸŸ¡ðŸ”´, sugestÃ£o de carga, e1RM/PR, aba ProgressÃ£o, fadiga, deload, check-in |
| 6 | Corpo e grÃ¡ficos | ðŸ‘€ | 20/10/2026 | Peso, medidas, fotos, alerta de ritmo, tela EvoluÃ§Ã£o com grÃ¡ficos |
| 7 | Exportar Excel e backup | â¬œ | | |
| 8 | PWA, offline e hospedagem | â¬œ | | |

Legenda: â¬œ nÃ£o iniciada Â· ðŸ”¨ em andamento Â· ðŸ‘€ esperando o teste do Lucas Â· âœ… aprovada (com commit)

## Feito
- **DecisÃµes (17/10/2026):** os â“ de `docs/03-decisoes.md` foram respondidos. Treino Aâ€“E; depois da S3, repetir o bloco (deload sÃ³ com fadiga alta); Muscle Round 4Ã—4; BO âˆ’20%; nome **SIMEAOBuddy**; destaque azul `#3B82F6` + roxo `#8B5CF6`.
- **Etapa 0:** Express 5 + `node:sqlite` (migraÃ§Ã£o `001_base`: tabela `config`), `GET /api/saude`, SPA por hash (`public/js/app.js`, uma tela por arquivo em `public/js/telas/`), tema em `public/css/tema.css`, navegaÃ§Ã£o inferior no celular e lateral no desktop (â‰¥ 900px), `iniciar.bat`, 6 testes (banco + servidor). Git iniciado (commit depois do ok).

- **Etapa 1:** login mudou (decisÃ£o do Lucas, `docs/03` item 11): admin Ãºnico `lucasimeao` com senha (jÃ¡ criado no banco real); alunos entram com Google e ficam **aguardando aprovaÃ§Ã£o**. MigraÃ§Ã£o `002_pessoas` (usuarios, sessoes, alunos/anamnese). Bloqueio apÃ³s 5 senhas erradas (15 min) + limite por IP. Telas: login, aguardando, Alunos (abas Aguardando/Ativos/Desativados + ficha com anamnese, aprovar/recusar/desativar), Perfil (anamnese sÃ³ leitura para o aluno; trocar senha para o admin), Hoje com aviso de pendentes. NavegaÃ§Ã£o do admin some para aluno. Tailscale instalado; guia em `DEPLOY.md`. 26 testes.

- **Etapa 2:** migraÃ§Ã£o `003_exercicios`. Seed em `src/db/dados/biblioteca.js`, que entra sozinho quando a biblioteca estÃ¡ vazia (Ã© dado de referÃªncia, nÃ£o de exemplo). Os exercÃ­cios das fichas que sÃ£o os mesmos da planilha viram um sÃ³, com o nome da ficha, e o nome antigo fica em "outros nomes" (ex.: Voador mÃ¡quina â†’ Crucifixo mÃ¡quina). Grupos musculares e equipamentos em `src/treino/grupos.js`, com regiÃ£o superior/inferior para a escada. Busca sem acento, filtro por grupo (o principal vem primeiro, depois os indiretos), criar/editar/desativar (sÃ³ admin), substitutos ligados a outros exercÃ­cios. 38 testes.

- **Etapa 3:** decisÃµes novas no `docs/03` (o Lucas tambÃ©m treina; exceÃ§Ãµes 2â†’3â†’2+BO; Muscle Round = 1 MR fixo). MigraÃ§Ã£o `004_programas` (programas, sessoes_modelo, itens_sessao, itens_semana). Regras puras em `src/treino/`: `escada.js` (escada padrÃ£o, "2 WS" = 1 WS RIR 1 + 1 TOP RIR 0, BO âˆ’20%), `feeders.js` (50/75/90 Â· 75/90 Â· 80, arredondadas ao incremento), `volume.js` (warm-up no 1Âº exercÃ­cio de cada grupo, sÃ©ries por mÃºsculo, avisos <4 e >10). Modelo pronto em `src/db/dados/modelo.js`, criado sozinho quando nÃ£o existe nenhum modelo. Telas: Programas (copiar o modelo para alguÃ©m, montar do zero, editor por treino com a escada clicÃ¡vel, formulÃ¡rio do item, aba Volume) e Planilha (abas por treino, um bloco por microciclo com as colunas da planilha, aba Escada editÃ¡vel). 63 testes. Conferido em prints de celular (390px) e desktop.

- **Etapa 4:** treino do dia pela sequÃªncia (decisÃ£o no `docs/03` item 3). MigraÃ§Ã£o `005_treinos` (treinos_realizados, series_realizadas com uuid, trocas_treino). Regras puras novas: `sequencia.js` (prÃ³ximo treino, micro, semana da escada que se repete) e `tonelagem.js` (tonelagem, total de reps, carga utilizada = top, back-off âˆ’20%, variaÃ§Ã£o %). As regras de `src/treino/` tambÃ©m sÃ£o servidas em `/js/treino/`, entÃ£o a ficha usa as mesmas funÃ§Ãµes (feeders e BO ao vivo) sem copiar cÃ³digo. Telas: Hoje (prÃ³ximo treino, continuar, escolher outro, Ãºltimo treino), Ficha (`#/treino/ID`: warm-up, feeders com kg, WS/TOP/BO/MR com +/âˆ’, micro anterior, repetir anterior, timer com vibraÃ§Ã£o e bipe, trocar exercÃ­cio, observaÃ§Ãµes, finalizar/descartar), Resumo (`#/treino/ID/resumo`). A planilha passa a mostrar reps/kg/total/carga/tonelagem e as observaÃ§Ãµes; os microciclos depois da S3 viram blocos novos (Micro 4, 5â€¦). Apagar treino ou exercÃ­cio com histÃ³rico agora Ã© bloqueado. 83 testes + teste de ponta a ponta no navegador (Edge, 390px).

- **Etapa 5:** migraÃ§Ã£o `006_checkins`. Regras puras novas: `progressao.js` (status progrediu/manteve/regrediu, variaÃ§Ã£o % contra o micro anterior e o Micro 1, desvio da faixa, sugestÃ£o de carga por dupla progressÃ£o, e1RM), `fadiga.js` (baixa/moderada/alta/NÃƒO EXECUTADO com as mensagens do `docs/04`, limites em `LIMITES`, sugestÃ£o de deload) e `checkin.js` (semana ISO, mÃ©dia). `src/db/progressao.js` monta tudo por treino Ã— microciclo e por microciclo (todos os treinos juntos). Telas: ficha com a "sugestÃ£o de hoje" em cada exercÃ­cio; resumo com ðŸŸ¢ðŸŸ¡ðŸ”´ e PR (melhor e1RM); Hoje com check-in semanal (5 notas de 1 a 5), fadiga do Ãºltimo micro e alerta de deload; Planilha com a aba **ProgressÃ£o** (quadro geral por micro + um bloco por micro de cada treino com tonelagem/reps/carga, % e "AnÃ¡lise do microciclo"). SÃ©rie salva sem RIR fica com o RIR planejado. `npm run seed` agora cria a "Ana Exemplo" com 5 micros (sobe, sobe, cai, cai â†’ deload). 108 testes + prints no Edge (390px).

- **Etapa 6:** migraÃ§Ã£o `007_corpo` (pesos 1 por dia, medidas 1 por dia, fotos). Regras puras em `src/treino/corpo.js`: mÃ©dia mÃ³vel de 7 dias, ritmo por semana/mÃªs e alerta quando as 2 Ãºltimas semanas ficam fora da meta do objetivo da anamnese. Rotas `/api/corpo` (peso, medidas, fotos) e `/api/evolucao`; o admin vÃª os alunos com `?aluno_id=`. Fotos: o celular reduz para atÃ© 1280 px, o servidor confere que Ã© imagem de verdade (assinatura do arquivo), guarda em `data/fotos/<banco>/<pessoa>/` e sÃ³ entrega para o dono ou o admin. Tela **Corpo** (peso do dia com +/âˆ’, Ãºltimos registros, medidas com a variaÃ§Ã£o, fotos) e tela **EvoluÃ§Ã£o** (peso com mÃ©dia, medidas, tonelagem por microciclo com ðŸŸ¢ðŸŸ¡ðŸ”´ e fadiga, tonelagem por treino, e1RM e tonelagem por exercÃ­cio com tabela e status). Chart.js 4.4.7 servido de `node_modules` em `/vendor/`. Seed: a Ana Exemplo ganhou 10 semanas de peso (alerta de ritmo lento) e 5 medidas. 120 testes + prints no Edge (390px).

## PendÃªncias / DECIDIR
- **GrÃ¡ficos com uma sÃ©rie sÃ³, em azul:** o validador de cores reprovou azul + roxo juntos (quem tem daltonismo nÃ£o diferencia) e verde/amarelo/vermelho em barras. Por isso o status ðŸŸ¢ðŸŸ¡ðŸ”´ aparece em tabela com nÃºmeros, e no peso os pontos do dia sÃ£o cinza e a mÃ©dia Ã© azul.
- **Medidas:** um valor de braÃ§o e um de coxa (o `docs/03` item 13 fala "braÃ§o" e "coxa"; o `docs/02` tinha direito/esquerdo). Se quiser os dois lados, Ã© sÃ³ pedir.
- **Volume semanal por grupo muscular** (citado no `docs/02`) nÃ£o entrou na EvoluÃ§Ã£o, porque o `docs/05` nÃ£o pede; o contador por mÃºsculo continua em Programas â†’ Volume.
- **Alerta de peso** aparece em Corpo e EvoluÃ§Ã£o (nÃ£o no Hoje). Sem objetivo na anamnese, sÃ³ mostra o ritmo.
- **Status com a escada (Etapa 5):** para o status ðŸŸ¢ðŸŸ¡ðŸ”´ e para a fadiga, comparo a **tonelagem por sÃ©rie sem o BO** (senÃ£o a S2 com 3 sÃ©ries sempre "progride" e a S1 seguinte sempre "regride"). A coluna Tonelagem e as % da planilha continuam com o total, como na planilha original.
- **Mesma carga com menos reps** = regrediu (a regra do `docs/04` nÃ£o cobre esse caso; `// DECIDIR` em `progressao.js`). Reps do TOP abaixo do mÃ­nimo = regrediu mesmo tendo subido a carga (pulo grande demais).
- **SugestÃ£o abaixo da faixa:** propÃµe âˆ’5% arredondado ao incremento; se isso passar de âˆ’10% (ex.: 25 â†’ 20 kg numa mÃ¡quina de 5 em 5), sugere sÃ³ manter.
- **Deload:** o app sÃ³ **sugere** (cartÃ£o no Hoje e na aba ProgressÃ£o). Rodar a semana de deload dentro da ficha (metade das sÃ©ries, RIR 3â€“4) nÃ£o estÃ¡ feito; se quiser, entra numa etapa futura.
- **Check-in:** fica na tela Hoje (uma vez por semana, dÃ¡ para corrigir na mesma semana). MÃ©dia â‰¤ 2 sugere deload. Em todas as notas 5 = melhor (dor 5 = sem dor).
- **Fadiga do microciclo** junta todos os treinos daquele micro; o deload olha os 2 Ãºltimos micros com treino.
- **NavegaÃ§Ã£o do admin no celular:** as 4 telas do treinador ficam dentro da 5Âª aba "GestÃ£o" (sÃ³ o admin vÃª). No desktop aparecem direto na barra lateral.
- **Falta o Lucas:** ativar o Funnel no Tailscale (o login jÃ¡ foi feito; em 17/10 o Funnel ainda aparecia como desligado), criar as credenciais do Google e o `.env` (passo a passo em `DEPLOY.md`).
- **Biblioteca, confirmar:** classifiquei grupos, multi/isolado e equipamento dos 170 da planilha pelo nome. Tratei como iguais: Hack squat = Agachamento hack 45; BÃ­ceps martelo banco = Rosca martelo sentado; Panturrilha sentado = Banco solear; Puxada aberta = Puxada alta pronada. Ficaram separados: T-bar row x Remada cavalinho; Stiff x Terra romeno; ElevaÃ§Ã£o pÃ©lvica mÃ¡quina x ElevaÃ§Ã£o pÃ©lvica. DÃ¡ para corrigir tudo na tela Biblioteca.
- Trocar o mÃ©todo de um item para Muscle Round nÃ£o muda a escada sozinho: ajuste as semanas para "1 MR" na grade.
- Na planilha, a coluna "SÃ©ries warm up" mostra warm up + feeders (ex.: 4 = 1 warm up + 3 feeders).
- **Tonelagem com Muscle Round:** o `docs/05` cita sÃ³ ws/top/bo; incluÃ­ os blocos de MR na tonelagem, porque o MR conta como sÃ©rie no contador (`// DECIDIR` em `src/treino/tonelagem.js`).
- "Micro anterior" = a Ãºltima vez que a pessoa fez aquele exercÃ­cio (funciona mesmo trocando de programa).
- Feeders e warm-up tÃªm sÃ³ um âœ“ para marcar como feito (nÃ£o sÃ£o registrados, como manda o `docs/04`).
- Recusar um cadastro = desativar (nada Ã© apagado). Se quiser um botÃ£o de "apagar de vez", pedir.
- A fonte Inter vem do Google Fonts; sem internet, usa a fonte do sistema. Na Etapa 8, o service worker guarda a fonte no celular.

## Como rodar
- **Jeito fÃ¡cil:** Ã­cone **SIMEAOBuddy** na Ã¡rea de trabalho. O servidor jÃ¡ liga sozinho quando o Windows inicia (sem janela). Para desligar: `parar.bat`. Para tirar o inÃ­cio automÃ¡tico: `powershell -ExecutionPolicy Bypass -File instalar-atalhos.ps1 -Remover`.
- **Testar com dados fictÃ­cios:** duplo clique em `testar-exemplo.bat` (usa sÃ³ o `data/exemplo.db`; login `exemplo` / `exemplo123`). Para voltar ao banco real: `parar.bat` e depois o Ã­cone.
- PC: duplo clique em `iniciar.bat` (ou `npm start`) â†’ http://localhost:3100
- Celular (mesma Wi-Fi): use o endereÃ§o "No celular" que aparece na janela preta (ex.: `http://192.168.0.109:3100`).
- Link https (celular fora de casa e login Google): veja `DEPLOY.md`.
- Se o celular nÃ£o abrir pela Wi-Fi: libere o Node.js no firewall do Windows (na janela que aparece na 1Âª vez, marque **Redes privadas** â†’ Permitir).
