# Como mandar para o Claude Code (passo a passo)

## ⭐ JEITO SIMPLES (comece por aqui)

**1.** No app do Claude, clique em **+ Novo** (nova sessão).
**2.** Embaixo da caixa de texto, clique no nome da pasta e escolha **`C:\app-treinos`**.
**3.** Cole este texto e aperte Enter:

```text
Leia o CLAUDE.md e todos os arquivos da pasta docs. Eles descrevem o app de treino que eu quero.

Antes de programar:
1. me faça as perguntas que precisar (no máximo 6, de múltipla escolha), principalmente sobre os itens com ❓ em docs/03-decisoes.md, e salve minhas respostas nesse arquivo;
2. me mostre um plano curto e espere eu aprovar.

Depois, construa o app UMA ETAPA POR VEZ, seguindo docs/05-requisitos.md. No fim de cada etapa: atualize o PROGRESSO.md, me explique em passos simples como testar no PC e no celular, e pare até eu dizer "ok".
```

**4.** Responda às perguntas que ele fizer e aprove o plano.
**5.** A cada etapa pronta, teste e escreva:
- se deu certo: `Testei e está ok. Salve (commit) e siga para a próxima etapa.`
- se deu errado: `Deu problema: [o que aconteceu]. Corrija e me diga como testar de novo.` (arraste o print junto)

**6.** Voltou outro dia ou a conversa ficou muito longa? Abra uma **sessão nova na mesma pasta** e escreva:
`Leia o CLAUDE.md e o PROGRESSO.md e continue de onde paramos.`

Pronto, é só isso. O resto deste arquivo é a versão detalhada (opcional).

---

## Por que mudou
Antes era um prompt gigante para colar de uma vez. Agora a especificação mora em **arquivos**, e você manda **prompts curtos**:

| Arquivo | Para que serve |
|---|---|
| `CLAUDE.md` | O Claude Code **lê sozinho em toda sessão**: regras, tecnologia, visual e onde está cada coisa |
| `PROGRESSO.md` | A "memória" do andamento: em que etapa está e o que falta |
| `docs/03-decisoes.md` | As suas decisões, com prioridade máxima. Já vem com o padrão preenchido |
| `docs/04-metodologia-treino.md` | O seu método (planilha + fichas) |
| `docs/05-requisitos.md` | As regras de cálculo, as telas, as 9 etapas e os critérios de pronto |

Vantagens: dá para **limpar a conversa a cada etapa** (`/clear`) sem perder nada, o Claude Code fica mais focado, gasta menos e não "esquece" regra no meio do caminho.
E ele **planeja antes de programar**.

---

## Antes de começar (5 min)
1. Abra `docs/03-decisoes.md` e confira os itens com ❓ (versão do treino, o que fazer depois da semana 3, Muscle Round, back-off, nome e cor).
   Se concordar, pode deixar; se não, corrija ali. Também dá para responder quando o Claude Code perguntar.
2. Ambiente: já conferi que o seu PC tem o **Node 24** e o **Claude Code 2.1** instalados ✅.

---

## Passo 1: abrir o Claude Code na pasta do projeto
No PowerShell (ou no Terminal do Windows):
```bash
cd C:\app-treinos
```
```bash
claude
```

## Passo 2: configurar a sessão
1. Digite `/model` e escolha o **Opus** (o mais forte; vale a pena para construir o app).
2. Aperte **Shift+Tab** até aparecer **plan mode** embaixo da caixa de texto.
   No modo de plano ele só lê e planeja, sem mexer em arquivo nenhum.

## Passo 3: colar o PROMPT 1 (só uma vez, no início)

```text
Vamos construir o app descrito nesta pasta.

1. Leia, nesta ordem: CLAUDE.md, PROGRESSO.md, docs/03-decisoes.md, docs/04-metodologia-treino.md, docs/05-requisitos.md, docs/02-plano-do-app.md e docs/01-pesquisa-low-volume.md. Só dê uma olhada em docs/exercicios-da-planilha.txt.

2. Ainda NÃO escreva código. Me apresente um plano com:
   a) a estrutura de pastas (até 20 linhas);
   b) o esquema do banco (tabelas e campos principais) que já cubra as etapas 1 a 8, incluindo os tipos de série, a escada por semana (itens_semana) e os microciclos;
   c) as funções de src/treino/ (nome, o que recebe, o que devolve) e os testes de cada uma;
   d) até 6 perguntas curtas, de múltipla escolha, sobre os itens com ❓ em docs/03-decisoes.md ou sobre qualquer coisa ambígua ou contraditória nos docs;
   e) os riscos que você vê (ex.: node:sqlite no Node 24, celular acessando o PC pelo Wi-Fi com o firewall do Windows, offline).

3. Quando eu responder as perguntas, registre as respostas em docs/03-decisoes.md (tirando o ❓).

4. Depois que eu aprovar o plano, execute SOMENTE a Etapa 0 de docs/05-requisitos.md, atualize o PROGRESSO.md, me diga como testar no PC e no celular, e pare.
```

## Passo 4: responder e aprovar o plano
- Responda às perguntas que ele fizer.
- Leia o plano. Se estiver bom, escolha a opção de aprovar **aceitando as edições automaticamente**: ele cria e edita os arquivos sem pedir um por um, mas continua pedindo permissão para rodar comandos.
- Se não estiver bom, diga o que mudar ("quero o banco com X", "tira Y") que ele refaz o plano.

## Passo 5: testar a etapa e aprovar
Siga o "como testar" que ele mandar. Se estiver tudo certo, mande o **PROMPT 2**:

```text
Testei a Etapa [N] e está ok. Faça o commit e marque a etapa como ✅ no PROGRESSO.md.
```

Se algo deu errado, use o **PROMPT 4 (bug)** lá embaixo.

## Passo 6: limpar e ir para a próxima etapa
1. Digite `/clear` (limpa a conversa; a memória fica no `CLAUDE.md` e no `PROGRESSO.md`).
2. Nas etapas grandes (**3, 4, 5 e 7**), aperte Shift+Tab até o **plan mode** de novo.
3. Cole o **PROMPT 3**:

```text
Leia o CLAUDE.md e o PROGRESSO.md e faça a próxima etapa de docs/05-requisitos.md. Consulte os outros docs só no que a etapa precisar.
Antes de codar, me mostre em até 10 linhas o que vai fazer e espere meu ok.
No fim: rode npm test, atualize o PROGRESSO.md, me diga como testar no PC e no celular, e pare.
```

Repita os passos 5 e 6 até a **Etapa 8**.

---

## Resumo do ciclo

```
PROMPT 1 (plano + Etapa 0) → você testa → PROMPT 2 (ok + commit) → /clear
PROMPT 3 (próxima etapa)   → você testa → PROMPT 2 (ok + commit) → /clear
... repete até a Etapa 8
```

---

## Prompts extras

**PROMPT 4: achei um bug**
```text
Problema na Etapa [N].
O que eu fiz: ...
O que eu esperava: ...
O que aconteceu: ... (cole a mensagem de erro ou arraste o print para cá)
Ache a causa antes de mexer. Corrija, adicione um teste se for regra de treino, e me diga como conferir.
```

**PROMPT 5: quero mudar uma regra do treino**
```text
Quero mudar uma regra: [como é hoje] → [como quero].
Primeiro atualize docs/03-decisoes.md (ou docs/04-metodologia-treino.md), depois o código e os testes. Me mostre o que muda antes de aplicar.
```

**PROMPT 6: voltei outro dia**
```text
Leia o CLAUDE.md e o PROGRESSO.md e me diga em 3 linhas onde paramos, o que está pendente e qual é o próximo passo.
```

**PROMPT 7: ajuste visual**
```text
Na tela [nome], [o que está ruim] (print anexado). Ajuste mantendo os tokens de cor e o estilo do CLAUDE.md, e confira no tamanho de celular (390px).
```

---

## Dicas
- **Esc** interrompe o Claude Code no meio; **Esc duas vezes** volta para uma mensagem anterior.
- **Print de tela:** arraste o arquivo da imagem para dentro do terminal (ou cole o caminho do arquivo).
- Se a conversa ficar muito longa dentro de uma etapa, digite `/compact`.
- Uma etapa por conversa. Não peça "faz tudo de uma vez": o resultado fica pior e mais difícil de testar.
- Nunca rode o Claude Code com `--dangerously-skip-permissions`.
- Prefere o app do Claude (aba **Code**) em vez do terminal? Escolha a pasta `C:\app-treinos`, ligue o modo de plano no seletor e use os mesmos prompts.
