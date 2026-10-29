// Etapa 5 de ponta a ponta: sugestão na ficha, status e PR no resumo, aba Progressão, fadiga, deload e check-in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, criarAdmin, criarAlunoGoogle, navegador } from './ajuda.js';
import { criarSessao } from '../src/auth/sessoes.js';
import { copiarPrograma } from '../src/db/programas.js';

async function cenario() {
  const s = await subirServidor();
  const { usuario, senha } = criarAdmin(s.db);
  const admin = navegador(s.url);
  await admin.pedir('/api/auth/entrar', { metodo: 'POST', corpo: { usuario, senha } });
  const idModelo = s.db.prepare('SELECT id FROM programas WHERE aluno_id IS NULL').get().id;
  const idAna = criarAlunoGoogle(s.db, 'Ana');
  const pAna = copiarPrograma(s.db, idModelo, idAna);
  const ana = navegador(s.url);
  criarSessao(s.db, { headers: {} }, { cookie: (k, v) => ana.definirCookie(k, v) }, idAna);
  return { s, admin, ana, pAna };
}

// Faz o próximo treino com a mesma carga e reps em todas as séries (Muscle Round: carga/5 com reps 4)
async function fazerTreino(nav, carga, reps) {
  const ficha = (await nav.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
  const url = `/api/treinos/${ficha.treino.id}/series`;
  for (const item of ficha.itens) {
    for (let p = 0; p < item.semana.series.length; p++) {
      if (item.metodo === 'muscle_round') {
        for (let b = 1; b <= item.mr_blocos; b++) await nav.pedir(url, { metodo: 'PUT', corpo: { item_id: item.id, posicao: p, bloco: b, carga: carga / 5, reps: 4 } });
      } else {
        await nav.pedir(url, { metodo: 'PUT', corpo: { item_id: item.id, posicao: p, carga, reps } });
      }
    }
  }
  return (await nav.pedir(`/api/treinos/${ficha.treino.id}/finalizar`, { metodo: 'POST', corpo: {} })).json;
}

const fazerMicro = async (nav, carga, reps) => { for (let i = 0; i < 5; i++) await fazerTreino(nav, carga, reps); };

test('ficha traz a sugestão de hoje; resumo traz status 🟢🟡🔴 e PR pelo e1RM', async () => {
  const { s, ana } = await cenario();
  try {
    const r1 = await fazerTreino(ana, 50, 8);
    assert.equal(r1.resumo.exercicios[0].status, null); // primeira vez: sem base
    assert.equal(r1.resumo.prs, 0);
    assert.equal(r1.itens[0].sugestao, null);
    for (let i = 0; i < 4; i++) await fazerTreino(ana, 50, 8); // fecha o micro 1
    const a2 = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
    assert.equal(a2.treino.microciclo, 2);
    assert.ok(a2.itens.every((i) => i.sugestao)); // todos já têm histórico
    // 50 kg × 8: no topo da faixa → sobe 1 incremento; dentro da faixa → mesma carga e 9 reps
    for (const item of a2.itens.filter((i) => i.metodo !== 'muscle_round')) {
      if (item.reps_max <= 8) assert.deepEqual([item.sugestao.acao, item.sugestao.kg], ['subir', 50 + item.exercicio.incremento_kg]);
      else if (item.reps_min <= 8) assert.deepEqual([item.sugestao.acao, item.sugestao.kg, item.sugestao.reps], ['mais_rep', 50, 9]);
      else assert.ok(['baixar', 'manter'].includes(item.sugestao.acao));
    }
  } finally { s.fechar(); }
});

test('resumo: mesma carga com mais reps = progrediu e PR; menos reps = regrediu', async () => {
  const { s, ana } = await cenario();
  try {
    await fazerMicro(ana, 50, 8);
    const melhor = await fazerTreino(ana, 50, 9); // A do micro 2
    const sup = melhor.resumo.exercicios[0];
    assert.equal(sup.status, 'progrediu');
    assert.equal(sup.pr, true);
    assert.ok(melhor.resumo.prs >= 1);
    const pior = await fazerTreino(ana, 50, 6); // B do micro 2
    assert.equal(pior.sessao.codigo, 'B');
    assert.ok(pior.resumo.exercicios.filter((e) => e.status === 'regrediu').length >= 2);
    assert.equal(pior.resumo.prs, 0);
  } finally { s.fechar(); }
});

test('aba Progressão: micro 1 = base, micro 2 melhor = fadiga baixa, micros 3 e 4 piores = alta → sugere deload', async () => {
  const { s, admin, ana, pAna } = await cenario();
  try {
    await fazerMicro(ana, 50, 8);
    await fazerMicro(ana, 50, 9);
    let p = (await admin.pedir(`/api/treinos/progressao/${pAna}`)).json;
    assert.equal(p.micros[0].fadiga.nivel, 'base');
    assert.equal(p.micros[1].fadiga.nivel, 'baixa');
    assert.equal(p.micros[2].fadiga.nivel, 'nao_executado');
    const a2 = p.sessoes[0].micros[1];
    assert.equal(a2.executado, true);
    assert.equal(a2.micro_anterior, 1);
    assert.ok(a2.exercicios.every((e) => e.status === 'progrediu'));
    assert.ok(a2.exercicios[0].vs_micro1.tonelagem > 0);
    assert.equal(p.deload.sugerir, false);

    await fazerMicro(ana, 45, 5); // abaixo da faixa em tudo
    await fazerMicro(ana, 40, 4);
    p = (await admin.pedir(`/api/treinos/progressao/${pAna}`)).json;
    assert.equal(p.micros[2].fadiga.nivel, 'alta');
    assert.equal(p.micros[3].fadiga.nivel, 'alta');
    assert.equal(p.deload.sugerir, true);
    assert.match(p.deload.como, /metade das séries/);
    // o aluno vê o alerta na tela Hoje, mas não a aba Progressão
    const hoje = (await ana.pedir('/api/treinos/hoje')).json;
    assert.equal(hoje.deload.sugerir, true);
    assert.equal(hoje.fadiga.nivel, 'alta');
    assert.equal((await ana.pedir(`/api/treinos/progressao/${pAna}`)).status, 403);
  } finally { s.fechar(); }
});

test('check-in semanal: valida as notas, um por semana (corrigir não duplica) e média baixa sugere deload', async () => {
  const { s, ana, pAna, admin } = await cenario();
  try {
    let r = await ana.pedir('/api/checkins');
    assert.equal(r.json.atual, null);
    assert.equal(r.json.perguntas.length, 5);
    assert.equal((await ana.pedir('/api/treinos/hoje')).json.checkin_pendente, true);

    r = await ana.pedir('/api/checkins', { metodo: 'PUT', corpo: { sono: 4, energia: 6, dor: 3, estresse: 3, dieta: 3 } });
    assert.equal(r.status, 400);
    assert.match(r.json.erro, /Energia/);
    r = await ana.pedir('/api/checkins', { metodo: 'PUT', corpo: { sono: 4, energia: 4, dor: 3 } });
    assert.equal(r.status, 400);

    r = await ana.pedir('/api/checkins', { metodo: 'PUT', corpo: { sono: 2, energia: 1, dor: 2, estresse: 2, dieta: 3, comentario: 'semana pesada' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.checkin.media, 2);
    r = await ana.pedir('/api/checkins', { metodo: 'PUT', corpo: { sono: 1, energia: 1, dor: 2, estresse: 2, dieta: 3 } });
    assert.equal(r.json.checkin.media, 1.8);
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM checkins').get().n, 1);

    const hoje = (await ana.pedir('/api/treinos/hoje')).json;
    assert.equal(hoje.checkin_pendente, false);
    assert.equal(hoje.deload.sugerir, true);
    assert.match(hoje.deload.motivo, /check-in/);
    assert.equal((await admin.pedir(`/api/treinos/progressao/${pAna}`)).json.checkin.media, 1.8);
    assert.equal((await navegador(s.url).pedir('/api/checkins')).status, 401);
  } finally { s.fechar(); }
});

test('RIR não informado fica o RIR planejado (WS = 1, TOP = 0)', async () => {
  const { s, ana } = await cenario();
  try {
    const f = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
    const sup = f.itens[0];
    const url = `/api/treinos/${f.treino.id}/series`;
    const a = (await ana.pedir(url, { metodo: 'PUT', corpo: { item_id: sup.id, posicao: 0, carga: 60, reps: 8 } })).json.serie;
    const b = (await ana.pedir(url, { metodo: 'PUT', corpo: { item_id: sup.id, posicao: 1, carga: 60, reps: 8 } })).json.serie;
    const c = (await ana.pedir(url, { metodo: 'PUT', corpo: { item_id: sup.id, posicao: 1, carga: 60, reps: 8, rir: 2 } })).json.serie;
    assert.deepEqual([a.rir, b.rir, c.rir], [1, 0, 2]);
  } finally { s.fechar(); }
});
