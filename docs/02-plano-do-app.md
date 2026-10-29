# Plano do app "Treino" (nome provisório)

App pessoal de treino **low volume para naturais**, para você e alguns amigos (até ~10 pessoas).
Funciona no celular como app (PWA: "Adicionar à tela inicial"), com tema preto, clean e moderno.

Marcações **⚠ DECIDIR** = pontos que dependem de você.

---

## 1. Perfis de uso

| Perfil | O que faz |
|---|---|
| **Treinador/Admin** (você) | Cadastra alunos, monta programas e periodização, edita fichas, vê a evolução de todos, exporta planilhas |
| **Aluno** (amigos e você mesmo) | Vê o treino do dia, registra as séries, peso e medidas, vê os próprios gráficos |

Login simples: **nome + PIN de 4 a 6 dígitos**. Sem e-mail, sem senha complicada.
⚠ DECIDIR: os amigos podem editar a própria ficha ou só você edita?

---

## 2. Telas

### Aluno (celular primeiro)
1. **Hoje**: card grande com o treino do dia (ex.: "Semana 3 · Upper A · RIR 1"), botão "Começar treino",
   resumo da última sessão e o próximo deload.
2. **Ficha em execução** (a tela mais importante; segue o formato das fichas do PDF, veja `04-metodologia-treino.md`):
   - Cabeçalho: "Treino A · Push · Semana 2 de 3".
   - Cada exercício é um card com nome, botão **▶ vídeo**, faixa de reps, cadência **2-0-1-0**, descanso e observações/substitutos.
   - Dentro do card, as séries em linhas, **etiquetadas por tipo** e com cor própria:
     `WARM UP` (cinza, só no 1º exercício do grupo, sem registro) → `FEEDER` (carga **calculada** em % da carga de trabalho, RIR ≥ 5, descanso curto) →
     `WS` (RIR 1–3) → `TOP` (RIR 0) → `BO` (back-off, quando a semana manda) → `MUSCLE ROUND` (blocos com 10 s).
   - Mostra **o que fez no microciclo anterior** (kg × reps de cada série) e a **sugestão de hoje**
     ("subir para 62,5 kg" / "manter 60 kg e buscar 8 reps").
   - Campos grandes para kg e reps, com +/− e "repetir anterior" num toque. Registro obrigatório só em WS/TOP/BO.
   - **Timer de descanso** que começa sozinho com o tempo do tipo de série (feeder ~30–60 s; WS/TOP 120/150/180 s), com vibração no fim.
   - Substituir exercício na hora, usando os substitutos cadastrados ("na falta da máquina, smith…").
   - Ao finalizar: duração, **tonelagem do treino**, comparação com o micro anterior (🟢/🟡/🔴 por exercício), PRs 🏆 e observações do treino.
3. **Evolução**: gráficos de
   - **tonelagem por exercício, por treino e por microciclo** (com a variação %);
   - e1RM (força estimada) por exercício;
   - carga e reps da série principal ao longo das semanas;
   - **volume semanal por grupo muscular** (séries diretas = 1, indiretas = 0,5) x faixa alvo;
   - peso corporal (pontos diários + **média móvel de 7 dias**);
   - medidas (cintura, braço, coxa, peito, quadril…);
   - % de gordura (opcional).
4. **Corpo**: registrar peso (rápido, diário), medidas (semanal/quinzenal) e fotos (opcional).
5. **Check-in semanal** (30 segundos): sono, energia, dor/articulações, estresse e aderência à dieta, de 1 a 5.
   Alimenta o alerta de deload.
6. **Histórico**: lista de sessões anteriores, com detalhe de cada uma.

### Treinador / Admin
7. **Alunos**: lista com objetivo, mesociclo atual, semana e último treino ("há 3 dias").
8. **Perfil do aluno / Anamnese**: idade, sexo, altura, peso, objetivo (emagrecimento | hipertrofia),
   nível (iniciante | intermediário | avançado), dias disponíveis, tempo por sessão, equipamentos,
   lesões/restrições, exercícios a evitar, preferências, meta (ex.: "−6 kg até março").
9. **Montar programa**: partir do **modelo pronto "Push · Pull · Lower I · Upper · Lower – Volume em escada"**
   (vem cadastrado com os exercícios das fichas) ou de outra divisão (Full Body 3x, Upper/Lower 4x, PPL, personalizada),
   montar sessões arrastando exercícios da biblioteca e definir séries, faixa de reps, RIR, descanso,
   método (retas | top set + back-off | rest-pause/HIT) e observações.
   - Mostra **ao vivo** o volume semanal por músculo, com aviso de "abaixo de 4" ou "acima de 10".
   - Botão "Gerar sugestão" a partir do objetivo, nível e dias (usa as regras da pesquisa).
10. **Planilha de periodização** (recria a "PLANILHA AVANÇADO" dentro do app):
    - **Aba por treino** (Treino 1…5 / A…E), com **um bloco por microciclo** (Micro 1…N). Cada linha de exercício tem:
      `nº | exercício | séries warm up | séries work | reps work | RIR work | séries top | reps top | RIR top | intervalo | Série 1..5 (reps, kg) | total reps | kg | tonelagem`,
      mais "observações sobre o treino" no fim de cada bloco.
    - Visão **"Volume em escada"**: grade semanas × exercícios mostrando quantas WS/BO cada exercício tem em cada semana
      (ex.: S1 2 WS → S2 3 WS → S3 3 WS; isolados S3 2 WS + 1 BO), editável por exercício.
    - **Aba de Progressão por treino** (igual "PROG. TREINO A…F"): tabelas exercício × microciclo de
      **tonelagem (%)**, **reps realizadas (desvio)** e **carga utilizada (%)**, mais o quadro
      **"Análise do microciclo N"** (vol. de carga · carga · reps mín/máx → diferença → resultado → fadiga → mensagem).
    - Visão macro: linha do tempo de blocos/mesociclos.
    - **Exportar para Excel (.xlsx)** no mesmo layout da planilha original (sem os erros `#REF!` dela) e **PDF/impressão** da ficha.
11. **Biblioteca de exercícios**: nome, grupo muscular, tipo (multiarticular/isolado; "estável" sim/não),
    equipamento, **link de vídeo**, observações de técnica, **substitutos** e incremento de carga.
    Vem com os **170 exercícios da planilha** (`docs/exercicios-da-planilha.txt`) + os das fichas, já com os vídeos.
12. **Painel geral**: quem treinou na semana, quem sumiu, PRs da turma e alertas de deload.
13. **Configurações e Backup**: exportar/importar tudo (JSON e Excel), unidades (kg) e incrementos
    de carga (halteres de 2 em 2 kg, anilhas de 1,25 kg…).

---

## 3. Regras de negócio (o "cérebro" do app)

> As regras de treino detalhadas estão em **`04-metodologia-treino.md`** (o método do Lucas), que tem prioridade.

- **Tipos de série**: warm up / feeder / WS / top / back-off / muscle round; só WS, TOP e BO contam volume e tonelagem.
- **Feeders automáticas**: carga = % da carga de trabalho (50/75/90% nos principais; 75/90% nos secundários; 80% nos isolados),
  arredondada ao incremento do aparelho.
- **Tonelagem** = Σ reps × kg das séries válidas, por exercício, treino e microciclo, com a variação % contra o micro anterior e contra o Micro 1.
- **Sobrecarga progressiva**: comparar Treino X – Micro N com o Micro N−1 → 🟢 progrediu / 🟡 manteve / 🔴 regrediu.
- **Dupla progressão**: top set no máximo da faixa com o RIR alvo → subir a carga (menor incremento disponível);
  dentro da faixa → manter e buscar +1 rep; abaixo do mínimo → manter/baixar 5–10%.
- **Volume em escada**: o número de WS/BO por semana é configurável por exercício (padrão 2 → 3 → 3 nos multi estáveis de superiores; isolados S3 + 1 BO; inferiores fixos em 2).
- **Análise de fadiga por microciclo**: baixa / moderada / alta, com uma mensagem (regra na seção 4 do `04`);
  fadiga alta em 2 micros seguidos ou check-in com média ≤ 2 → sugerir deload.
- **Deload** (se você adotar): semana com ~50% das séries, RIR 3 a 4, carga igual ou −10%.
- **Novo mesociclo**: ao terminar, oferece "repetir com as cargas novas" ou "trocar exercícios"
  e leva as melhores marcas como ponto de partida.
- **Emagrecimento**: meta de peso de −0,5 a −1%/semana; o app avisa se estiver caindo rápido
  demais (> 1%/semana por 2 semanas) ou se a força cair > 10%. Mostra "carga mantida ✅" como vitória.
- **Hipertrofia**: meta de +0,25 a +0,5%/mês (treinados) ou um pouco mais (iniciantes); avisa se
  o peso subir rápido demais.
- **e1RM** pela fórmula de Epley ajustada pelo RIR: `e1RM = carga × (1 + (reps + RIR) / 30)`.
- Volume semanal por músculo = Σ séries diretas + 0,5 × Σ séries indiretas (só séries de trabalho).

⚠ DECIDIR: o que não estiver no `04` usa os padrões da pesquisa (`01`).

---

## 4. Dados que o app guarda

| Tabela | Campos principais |
|---|---|
| `usuarios` | id, nome, pin_hash, papel (admin/aluno), criado_em |
| `alunos` (perfil) | usuario_id, sexo, nascimento, altura_cm, objetivo, nível, dias_semana, minutos_sessao, equipamentos, restrições, meta_texto, meta_peso |
| `exercicios` | id, nome, grupo_primario, grupos_secundarios (JSON c/ fração), tipo (multi/isolado), estavel (bool), equipamento, video_url, observacoes, substitutos (JSON), incremento_kg |
| `mesociclos` (blocos) | id, aluno_id, nome ("Volume em escada"), fase, inicio, n_microciclos, semana_deload (opcional), status |
| `sessoes_modelo` | id, mesociclo_id, codigo ("A"), nome ("Push"), ordem |
| `itens_sessao` | id, sessao_modelo_id, exercicio_id, ordem, papel (principal/secundário/isolado → define as feeders), warmup (bool), reps_min, reps_max, cadencia ("2-0-1-0"), descanso_seg, metodo (normal/muscle_round), observacoes |
| `itens_semana` | item_id, microciclo, n_ws, rir_ws, n_top, rir_top, n_bo, reps_bo, pct_bo (a "escada" por semana) |
| `treinos_realizados` | id, aluno_id, sessao_modelo_id, microciclo, data, inicio, fim, observacao |
| `series_realizadas` | id, treino_id, item_id, exercicio_id (pode ser substituto), ordem, tipo (warmup/feeder/ws/top/bo/muscle_round), carga, reps, rir, nota |
| `medidas_corporais` | id, aluno_id, data, peso, cintura, quadril, peito, braço_d/e, coxa_d/e, panturrilha, %gordura, foto_url |
| `checkins` | id, aluno_id, semana_iso, sono, energia, dor, estresse, dieta, comentario |

---

## 5. Tecnologia sugerida

Pensada para **ser simples de rodar, barata e parecida com o Balcão** (que você já conhece:
Node.js + JavaScript puro).

| Parte | Escolha | Por quê |
|---|---|---|
| Servidor | **Node.js 22+ com Express** | Mesmo padrão do Balcão; fácil de manter com o Claude Code |
| Banco | **SQLite** (`node:sqlite` nativo ou `better-sqlite3`) | Um arquivo só, backup é copiar o arquivo; sobra para 10 pessoas |
| Frontend | **HTML + CSS + JavaScript puro em módulos**, como **PWA** (manifest + service worker) | Sem etapa de build; instala no celular como app; funciona offline na academia |
| Gráficos | **Chart.js** | Leve, bonito no tema escuro |
| Excel | **SheetJS (xlsx)** ou **ExcelJS** | Exportar a planilha de periodização e o histórico |
| Login | PIN com hash (bcrypt/scrypt) + cookie de sessão | Simples e seguro o bastante |
| Hospedagem | ⚠ DECIDIR (veja abaixo) | |

**Onde hospedar (para os amigos acessarem do celular fora da sua casa):**
- **Opção A, recomendada:** uma VPS pequena (ex.: Hetzner, Contabo, Oracle Free Tier) ou o **Railway/Render/Fly.io**
  com disco persistente. Custa de R$ 0 a R$ 30/mês e fica acessível 24h por um link.
- **Opção B:** rodar no seu PC e expor com **Cloudflare Tunnel** ou **Tailscale**. Grátis, mas só
  funciona com o PC ligado.

**Offline**: a ficha do dia fica salva no celular (IndexedDB); se a internet da academia cair,
as séries ficam numa fila e sincronizam depois.

---

## 6. Visual

- Fundo **#0A0A0A**, superfícies #141414 / #1C1C1C, bordas #262626, texto #FAFAFA / #A3A3A3.
- **Uma cor de destaque** só (⚠ DECIDIR: verde-limão #C6F432, laranja #FF6B1A ou azul #3B82F6).
- Fonte **Inter** (ou Geist); números com `font-variant-numeric: tabular-nums`.
- Cantos arredondados de 12 a 16px, sombras quase nulas, muito espaço, ícones de linha (Lucide).
- Celular primeiro: botões com no mínimo 48px, navegação inferior com 4 abas
  (Hoje · Evolução · Corpo · Perfil), e uso com uma mão só.
- Microinterações discretas: vibração ao fechar uma série, confete minimalista em PR.
- No desktop (para você montar programas), um layout mais largo com tabela/planilha.

---

## 7. Ordem de construção (etapas)

| Etapa | Entrega | Pronto quando |
|---|---|---|
| **0. Base** | Estrutura do projeto, servidor, banco, tema preto, layout com navegação, `CLAUDE.md`, script `iniciar.bat` | Abre no navegador e no celular (mesma rede) com a tela vazia já estilizada |
| **1. Pessoas** | Login por PIN, cadastro de alunos e anamnese, papéis admin/aluno | Você cria 2 amigos, cada um entra e só vê o seu |
| **2. Biblioteca** | ~80 exercícios com grupos e frações; CRUD | Busca e filtro por músculo funcionam |
| **3. Programa e periodização** | Montar mesociclo, sessões, itens, RIR por semana, deload automático, contador de volume semanal; planilha semanas × exercícios | Um mesociclo de 5 semanas aparece certinho na grade |
| **4. Ficha na academia** | Treino do dia, registro de séries, timer, última vez/sugestão, substituição, resumo e PRs | Dá para fazer um treino real no celular, do início ao fim |
| **5. Progressão inteligente** | Dupla progressão, e1RM, alerta de queda, sugestão de deload, check-in semanal | As sugestões batem com as regras do item 3 |
| **6. Corpo e gráficos** | Peso, medidas, fotos; gráficos de evolução e volume | Os gráficos aparecem com dados de exemplo |
| **7. Exportar e backup** | Excel da periodização e do histórico, PDF/impressão da ficha, backup JSON | O arquivo .xlsx abre no Excel formatado |
| **8. PWA, offline e deploy** | Manifest, ícone, service worker, fila offline, guia de hospedagem | Instala no celular e registra séries sem internet |

Cada etapa termina com **teste manual guiado** + testes automáticos das regras (progressão, volume, e1RM).
