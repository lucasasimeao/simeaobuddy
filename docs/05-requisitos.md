# Requisitos, regras de cálculo, etapas e critérios de pronto

> Lido pelo Claude Code em todas as etapas. Prioridade: `03-decisoes` > `04-metodologia` > **este arquivo** > `02-plano` > `01-pesquisa`.

## 1. Objetivo
Um app que:
1. cadastra os alunos e identifica o objetivo (emagrecimento ou hipertrofia) e as condições de cada um (anamnese);
2. monta programas individualizados no método do Lucas (tipos de série, feeders, volume em escada, microciclos);
3. oferece fichas fáceis de usar no celular para registrar cada série (kg, reps);
4. acompanha os resultados continuamente (tonelagem, progressão, fadiga, e1RM, peso e medidas), com gráficos;
5. recria e exporta a "PLANILHA AVANÇADO" para Excel, sem erros de fórmula.

## 2. Regras de cálculo (funções puras em `src/treino/`, com testes)

1. **Tipos de série**, nesta ordem: `warmup` → `feeder` → `ws` → `top` → `bo` (back-off), mais o método `muscle_round`.
   - `warmup`: 1 série de 15 a 20 reps, leve, **só no 1º exercício de cada grupo muscular do treino**; não registra kg nem reps.
   - `feeder`: de 1 a 3 por exercício, RIR ≥ 5, descanso de ~30 a 60 s; não conta volume.
   - `ws`: RIR 1 (de 1 a 3 permitido); `top`: última série, RIR 0 ou técnica; `bo`: carga reduzida depois do top (ver `03`). **Registro obrigatório de kg e reps** em ws, top e bo.
   - `muscle_round`: blocos com 10 s de descanso entre eles (formato em `03`); registra a carga e as reps de cada bloco.
2. **Feeders automáticas** pelo papel do exercício no treino:
   principal = 10–12 reps @50% · 5 @75% · 2 @90% | secundário = 5 @75% · 2 @90% | isolado = 6 @80%.
   Carga = % da carga de trabalho prevista, **arredondada ao incremento do aparelho**. Editável por item.
3. **Cadência** padrão `2-0-1-0`. **Descanso** das séries válidas: 120 s por padrão (150 s na puxada pronada; 180 s em hack, elevação pélvica, stiff, leg press e búlgaro). Editável por item.
4. **Volume em escada**: o nº de WS/TOP/BO por microciclo é configurável **por exercício e por semana** (tabela `itens_semana`).
   Padrão: multiarticulares estáveis de superiores 2 → 3 → 3 WS; isolados de superiores 2 → 2 → 2 WS + 1 BO; inferiores e abdômen fixos em 2 WS.
   (Nas fichas, "2 WS" = 1 série RIR 1 + 1 TOP RIR 0.) O nº de microciclos do bloco é configurável.
5. **Tonelagem** = Σ (reps × kg) das séries ws/top/bo, por exercício, por treino e por microciclo. Também: total de reps e carga utilizada (ver `03`).
6. **Sobrecarga progressiva**: comparar Treino X – Micro N com o Micro N−1 **e** com o Micro 1: variação % de tonelagem, carga e reps, mais o desvio da faixa (reps abaixo do mínimo ou acima do máximo).
   Status por exercício: `progrediu` (subiu a carga, ou a carga igual com mais reps ou tonelagem) · `manteve` · `regrediu` (caiu a tonelagem e a carga, ou reps abaixo do mínimo).
7. **Sugestão de carga** (dupla progressão na faixa): top set ≥ reps_max com o RIR alvo → +1 incremento; dentro da faixa → mesma carga e +1 rep; abaixo do mínimo → manter ou −5 a 10%.
8. **Análise de fadiga por microciclo** (recria o quadro "ANÁLISE DO MICROCICLO"):
   baixa (≥ 70% dos exercícios progrediram) · moderada (a maioria manteve, ou a tonelagem caiu de 0 a 5%) · alta (≥ 2 exercícios regrediram, ou a tonelagem caiu > 5% em 2 micros seguidos) · "NÃO EXECUTADO".
   Cada nível tem uma mensagem. Fadiga alta em 2 micros seguidos → sugerir deload (formato em `03`). Os limites ficam em constantes fáceis de mudar.
9. **e1RM** = kg × (1 + (reps + RIR) / 30), para gráficos e PRs.
10. **Peso corporal**: média móvel de 7 dias. Metas por objetivo: emagrecimento −0,5 a −1%/semana; hipertrofia +0,25 a +0,5%/mês. Alertar quando estiver fora da meta por 2 semanas.
11. **Modelo pronto** no seed: o programa "Push · Pull · Lower I · Upper · Lower – Volume em escada", com exercícios, papéis, faixas, descansos, observações, substitutos e vídeos de `04` §5.
12. Outros alunos: o admin copia o modelo e ajusta. Mostrar o contador de séries válidas por músculo por semana, com um aviso abaixo de 4 e acima de 10 (padrão da pesquisa).

## 3. Telas
Base: seção "Telas" de `02-plano-do-app.md`. Prioridades:
- **Ficha em execução** (a mais importante): um card por exercício com ▶ vídeo, faixa, cadência, descanso, observações e substitutos.
  - As séries ficam em linhas etiquetadas por tipo, cada tipo com uma cor discreta: WARM UP / FEEDER (com a carga já calculada) / WS / TOP / BO / MUSCLE ROUND.
  - Ao lado de cada série, o que foi feito no micro anterior; acima, a "sugestão de hoje".
  - Campos grandes com +/− e "repetir anterior"; timer de descanso automático, com o tempo do tipo de série e vibração.
  - Substituir exercício na hora.
  - Resumo final: tonelagem, 🟢/🟡/🔴 por exercício contra o micro anterior, PRs e observações.
  - Tudo usável com uma mão.
- **Planilha** (admin; celular e desktop): recria a "PLANILHA AVANÇADO".
  - Uma aba por treino, com um bloco por microciclo e as colunas
    `nº | exercício | séries warm up | séries work | reps work | RIR work | séries top | reps top | RIR top | intervalo | Série 1..5 (reps, kg) | total reps | kg | tonelagem` + observações.
  - Visão "volume em escada" (semanas × exercícios, editável).
  - Aba **Progressão** por treino: tonelagem %, reps/desvio, carga % e o quadro "Análise do microciclo" com a fadiga e a mensagem.
- **Montar programa** (admin): começar do modelo pronto ou do zero; editar a escada por semana; contador de séries válidas por músculo.
- **Evolução**: tonelagem por exercício, treino e microciclo, e1RM, status de progressão, peso (pontos + média de 7 dias) e medidas.
- **Navegação inferior** no celular: Hoje · Evolução · Corpo · Perfil. O admin tem também: Alunos · Programas · Planilha · Biblioteca.
- **Biblioteca**: seed com `docs/exercicios-da-planilha.txt` + as fichas do `04`; campos: grupo muscular, multi/isolado, estável, equipamento, incremento, vídeo, observações e substitutos.

## 4. Visual
- Tema **preto**, clean e moderno; tokens no `CLAUDE.md`. Uma cor de destaque (ver `03`); verde e vermelho só para estados (PR, alerta, 🟢/🔴).
- Fonte Inter (Google Fonts) com fallback do sistema; números em `tabular-nums`; um número grande por card.
- Cantos de 12 a 16px, quase sem sombras, bastante espaço. Ícones Lucide.
- Celular primeiro (360 a 430px), toque ≥ 48px, sem rolagem horizontal; telas de admin mais largas no desktop.
- Animações de 150 a 200 ms, respeitando `prefers-reduced-motion`. Vibração curta ao fechar uma série e ao acabar o descanso.
- Ícone simples em SVG para o PWA, com o nome do app definido em `03`.

## 5. Etapas
Ao fim de cada uma: `npm test` → atualizar `PROGRESSO.md` → como testar (PC e celular) → **parar** e esperar o "ok" → commit.

| # | Etapa | Entrega | Pronto quando |
|---|---|---|---|
| 0 | Base | Pastas, servidor, `node:sqlite` com migrações, tema e layout com navegação, `iniciar.bat`, `npm start/test/seed`, `.gitignore`, `git init` + 1º commit, seção "Comandos" do `CLAUDE.md` preenchida | Abre no PC e no celular (mesma Wi-Fi) com o layout preto e a navegação funcionando |
| 1 | Pessoas e login | Login por PIN, primeiro acesso cria o admin, cadastro de alunos + anamnese, permissões | O admin cria 2 alunos; cada um entra e só vê o seu |
| 2 | Biblioteca | Seed dos 170 exercícios + os das fichas (vídeo, observações, substitutos), CRUD, busca e filtro | Busca por nome e filtro por grupo funcionam; os vídeos abrem |
| 3 | Programa, escada e planilha | Blocos/microciclos, treinos A–E, itens com papel/faixa/descanso, `itens_semana` (escada), modelo pronto no seed, contador de séries, tela Planilha (abas por treino, só a estrutura e os dados) | O modelo pronto aparece certinho na planilha, com 2/3/3 WS e o BO na S3 onde deve |
| 4 | Ficha na academia | Treino do dia, séries por tipo, feeders calculadas, registro, timer, micro anterior, substituição, resumo | Dá para fazer um treino real no celular, do início ao fim |
| 5 | Progressão, tonelagem e fadiga | Funções e testes das regras 5 a 9; sugestão de carga; aba Progressão; análise de fadiga; check-in semanal | Com dados de exemplo, os status e a fadiga batem com as regras (testes passando) |
| 6 | Corpo e gráficos | Peso, medidas, fotos opcionais (`data/fotos/`), gráficos de evolução | Os gráficos aparecem com os dados de exemplo |
| 7 | Exportar e backup | .xlsx no layout da planilha (abas por treino + progressão), impressão/PDF da ficha, backup/restauração JSON | O .xlsx abre no Excel formatado, sem `#REF!`/`#DIV/0!` |
| 8 | PWA, offline e hospedagem | Manifest, ícone, service worker, fila offline com sincronização, `DEPLOY.md` | Instala no celular e registra séries sem internet, sincronizando depois |

## 6. Critérios de pronto (app inteiro)
- [ ] O admin copia o modelo "Volume em escada" para um aluno novo e ajusta em menos de 5 minutos.
- [ ] O aluno entra pelo celular com o PIN e faz um treino completo: feeders calculadas, timer, micro anterior e sugestão, sem zoom e quase sem teclado.
- [ ] A tonelagem, os status (progrediu/manteve/regrediu) e a fadiga batem com a planilha original (há testes para isso).
- [ ] A escada (2 → 3 → 3 WS; BO na S3) aparece certa na ficha e na planilha.
- [ ] Os gráficos de tonelagem, e1RM, peso (média de 7 dias) e medidas funcionam.
- [ ] O .xlsx exportado abre bonito no Excel, sem erros de fórmula.
- [ ] O app instala no celular (PWA) e registra séries sem internet.
- [ ] Um aluno não vê nem edita os dados de outro.
- [ ] `npm test` passa; o `CLAUDE.md` explica como rodar, fazer backup e hospedar.
