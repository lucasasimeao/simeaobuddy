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
  const logar = (id) => {
    const nav = navegador(s.url);
    criarSessao(s.db, { headers: {} }, { cookie: (k, v) => nav.definirCookie(k, v) }, id);
    return nav;
  };
  const idAna = criarAlunoGoogle(s.db, 'Ana');
  const idBia = criarAlunoGoogle(s.db, 'Bia');
  const pAna = copiarPrograma(s.db, idModelo, idAna);
  return { s, admin, idAna, idBia, pAna, ana: logar(idAna), bia: logar(idBia) };
}

const serie = (item, posicao, carga, reps, extra = {}) => ({ item_id: item.id, posicao, carga, reps, ...extra });

// Registra todas as séries de um treino com a mesma carga/reps e finaliza
async function fazerTreino(nav, carga = 50, reps = 8) {
  const ficha = (await nav.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
  for (const item of ficha.itens) {
    for (let p = 0; p < item.semana.series.length; p++) {
      if (item.metodo === 'muscle_round') {
        for (let b = 1; b <= item.mr_blocos; b++) await nav.pedir(`/api/treinos/${ficha.treino.id}/series`, { metodo: 'PUT', corpo: serie(item, p, 10, 4, { bloco: b }) });
      } else {
        await nav.pedir(`/api/treinos/${ficha.treino.id}/series`, { metodo: 'PUT', corpo: serie(item, p, carga, reps) });
      }
    }
  }
  return (await nav.pedir(`/api/treinos/${ficha.treino.id}/finalizar`, { metodo: 'POST', corpo: { observacao: 'ok' } })).json;
}

test('Hoje: sem programa avisa; com programa mostra o próximo (A · Push · semana 1)', async () => {
  const { s, ana, bia } = await cenario();
  try {
    assert.equal((await bia.pedir('/api/treinos/hoje')).json.programa, null);
    const hoje = (await ana.pedir('/api/treinos/hoje')).json;
    assert.equal(hoje.proximo.codigo, 'A');
    assert.equal(hoje.proximo.nome, 'Push');
    assert.equal(hoje.proximo.semana, 1);
    assert.equal(hoje.sessoes.length, 5);
    assert.equal((await bia.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).status, 400);
  } finally { s.fechar(); }
});

test('ficha: semana 1 do Push com warm-up, feeders e as séries planejadas', async () => {
  const { s, ana } = await cenario();
  try {
    const f = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
    assert.equal(f.sessao.codigo, 'A');
    assert.equal(f.treino.microciclo, 1);
    const supino = f.itens[0];
    assert.equal(supino.exercicio.nome, 'Supino reto máquina');
    assert.equal(supino.tem_warmup, true);
    assert.deepEqual(supino.feeders.map((x) => x.pct), [50, 75, 90]);
    assert.deepEqual(supino.semana.series.map((x) => x.tipo), ['ws', 'top']);
    assert.equal(supino.anterior, null);
    assert.ok(supino.substitutos.some((x) => x.nome === 'Supino reto Smith'));
    // começar de novo devolve o mesmo treino
    const de_novo = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
    assert.equal(de_novo.treino.id, f.treino.id);
    assert.equal(de_novo.ja_existia, true);
  } finally { s.fechar(); }
});

test('registrar série: o tipo vem do plano, corrigir não duplica, uuid repetido não duplica', async () => {
  const { s, ana } = await cenario();
  try {
    const f = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
    const sup = f.itens[0];
    const url = `/api/treinos/${f.treino.id}/series`;
    const r = await ana.pedir(url, { metodo: 'PUT', corpo: serie(sup, 1, '62,5', 7, { tipo: 'ws', uuid: 'abc' }) });
    assert.equal(r.status, 200);
    assert.equal(r.json.serie.tipo, 'top', 'posição 1 de "2 WS" é o TOP');
    assert.equal(r.json.serie.carga, 62.5);
    await ana.pedir(url, { metodo: 'PUT', corpo: serie(sup, 1, 65, 6, { uuid: 'abc' }) });
    const linhas = s.db.prepare('SELECT * FROM series_realizadas WHERE treino_id = ?').all(f.treino.id);
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].carga, 65);

    const ruins = [
      [serie(sup, 5, 60, 8), /não existe/],
      [serie(sup, 0, -1, 8), /Carga/],
      [serie(sup, 0, 60, ''), /reps/i],
      [{ ...serie(sup, 0, 60, 8), item_id: 999999 }, /não faz parte/],
    ];
    for (const [corpo, msg] of ruins) {
      const x = await ana.pedir(url, { metodo: 'PUT', corpo });
      assert.equal(x.status, 400, JSON.stringify(corpo));
      assert.match(x.json.erro, msg);
    }
    await ana.pedir(`${url}?item_id=${sup.id}&posicao=1&bloco=0`, { metodo: 'DELETE' });
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM series_realizadas').get().n, 0);
  } finally { s.fechar(); }
});

test('Muscle Round: registra a carga e as reps de cada bloco', async () => {
  const { s, ana } = await cenario();
  try {
    const d = s.db.prepare("SELECT id FROM sessoes_modelo WHERE programa_id = (SELECT id FROM programas WHERE aluno_id IS NOT NULL) AND codigo = 'D'").get().id;
    const f = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: { sessao_id: d } })).json;
    const mr = f.itens.find((i) => i.metodo === 'muscle_round');
    assert.equal(mr.planejadas, 4);
    const url = `/api/treinos/${f.treino.id}/series`;
    for (const b of [1, 2, 3, 4]) {
      assert.equal((await ana.pedir(url, { metodo: 'PUT', corpo: serie(mr, 0, 10, 4, { bloco: b }) })).status, 200);
    }
    assert.equal((await ana.pedir(url, { metodo: 'PUT', corpo: serie(mr, 0, 10, 4, { bloco: 5 }) })).status, 400);
    const ficha = (await ana.pedir(`/api/treinos/${f.treino.id}`)).json;
    assert.equal(ficha.itens.find((i) => i.id === mr.id).registradas.length, 4);
  } finally { s.fechar(); }
});

test('finalizar: resumo com tonelagem e o próximo vira o B; depois o A mostra o micro anterior', async () => {
  const { s, ana } = await cenario();
  try {
    const fim = await fazerTreino(ana, 50, 8);
    assert.equal(fim.treino.status, 'finalizado');
    assert.equal(fim.resumo.faltando, 0);
    assert.equal(fim.resumo.exercicios[0].tonelagem, 2 * 50 * 8);
    assert.equal(fim.resumo.variacao, null, '1º treino não tem comparação');
    assert.equal((await ana.pedir('/api/treinos/hoje')).json.proximo.codigo, 'B');

    // faz B, C, D, E → volta para A no micro 2 (semana 2 da escada)
    for (let i = 0; i < 4; i++) await fazerTreino(ana);
    const hoje = (await ana.pedir('/api/treinos/hoje')).json;
    assert.deepEqual([hoje.proximo.codigo, hoje.proximo.microciclo, hoje.proximo.semana], ['A', 2, 2]);

    const f2 = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
    const sup = f2.itens[0];
    assert.deepEqual(sup.semana.series.map((x) => x.tipo), ['ws', 'ws', 'top'], 'semana 2: 3 WS');
    assert.deepEqual(sup.anterior.series.map((x) => [x.carga, x.reps]), [[50, 8], [50, 8]]);
  } finally { s.fechar(); }
});

test('resumo compara a tonelagem com a última vez', async () => {
  const { s, ana } = await cenario();
  try {
    await fazerTreino(ana, 50, 8);
    for (let i = 0; i < 4; i++) await fazerTreino(ana);
    const r = await fazerTreino(ana, 55, 8); // micro 2: supino com 3 séries a 55
    const sup = r.resumo.exercicios[0];
    assert.equal(sup.tonelagem_anterior, 800);
    assert.equal(sup.tonelagem, 3 * 55 * 8);
    assert.equal(sup.variacao, 65);
  } finally { s.fechar(); }
});

test('trocar exercício na hora: muda o exercício das séries e dá para voltar', async () => {
  const { s, ana } = await cenario();
  try {
    const f = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
    const sup = f.itens[0];
    const smith = sup.substitutos.find((x) => x.nome === 'Supino reto Smith');
    let ficha = (await ana.pedir(`/api/treinos/${f.treino.id}/trocar`, { metodo: 'POST', corpo: { item_id: sup.id, exercicio_id: smith.id } })).json;
    assert.equal(ficha.itens[0].exercicio.nome, 'Supino reto Smith');
    assert.equal(ficha.itens[0].exercicio_original.nome, 'Supino reto máquina');
    assert.equal(ficha.itens[0].substitutos[0].nome, 'Supino reto máquina', 'o original aparece para voltar');

    await ana.pedir(`/api/treinos/${f.treino.id}/series`, { metodo: 'PUT', corpo: serie(sup, 0, 40, 8) });
    assert.equal(s.db.prepare('SELECT exercicio_id FROM series_realizadas').get().exercicio_id, smith.id);
    // com série registrada, não troca
    assert.equal((await ana.pedir(`/api/treinos/${f.treino.id}/trocar`, { metodo: 'POST', corpo: { item_id: sup.id } })).status, 400);
    await ana.pedir(`/api/treinos/${f.treino.id}/series?item_id=${sup.id}&posicao=0`, { metodo: 'DELETE' });
    ficha = (await ana.pedir(`/api/treinos/${f.treino.id}/trocar`, { metodo: 'POST', corpo: { item_id: sup.id } })).json;
    assert.equal(ficha.itens[0].exercicio_original, null);
  } finally { s.fechar(); }
});

test('escolher outro treino e descartar', async () => {
  const { s, ana } = await cenario();
  try {
    const hoje = (await ana.pedir('/api/treinos/hoje')).json;
    const e = hoje.sessoes.find((x) => x.codigo === 'E');
    const f = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: { sessao_id: e.id } })).json;
    assert.equal(f.sessao.codigo, 'E');
    assert.equal((await ana.pedir(`/api/treinos/${f.treino.id}/descartar`, { metodo: 'POST' })).status, 200);
    assert.equal((await ana.pedir('/api/treinos/hoje')).json.em_andamento, null);
    assert.equal((await ana.pedir(`/api/treinos/${f.treino.id}/series`, { metodo: 'PUT', corpo: serie(f.itens[0], 0, 50, 8) })).status, 400);
  } finally { s.fechar(); }
});

test('cada um só vê e registra os próprios treinos; o admin vê', async () => {
  const { s, admin, ana, bia } = await cenario();
  try {
    const f = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
    assert.equal((await bia.pedir(`/api/treinos/${f.treino.id}`)).status, 404);
    assert.equal((await bia.pedir(`/api/treinos/${f.treino.id}/series`, { metodo: 'PUT', corpo: serie(f.itens[0], 0, 50, 8) })).status, 404);
    assert.equal((await bia.pedir(`/api/treinos/${f.treino.id}/finalizar`, { metodo: 'POST' })).status, 404);
    assert.equal((await admin.pedir(`/api/treinos/${f.treino.id}`)).status, 200);
    assert.equal((await admin.pedir(`/api/treinos/${f.treino.id}/series`, { metodo: 'PUT', corpo: serie(f.itens[0], 0, 50, 8) })).status, 404, 'admin não registra pelo aluno');
    assert.equal((await ana.pedir(`/api/treinos/planilha/${f.programa.id}`)).status, 403);
  } finally { s.fechar(); }
});

test('planilha recebe as séries; exercício com histórico não pode ser apagado do programa', async () => {
  const { s, admin, ana, pAna } = await cenario();
  try {
    await fazerTreino(ana, 50, 8);
    const pl = (await admin.pedir(`/api/treinos/planilha/${pAna}`)).json;
    assert.equal(pl.treinos.length, 1);
    assert.equal(pl.treinos[0].observacao, 'ok');
    assert.ok(pl.treinos[0].series.length > 0);

    const prog = (await admin.pedir(`/api/programas/${pAna}`)).json;
    const r = await admin.pedir(`/api/programas/itens/${prog.sessoes[0].itens[0].id}`, { metodo: 'DELETE' });
    assert.equal(r.status, 409);
    assert.equal((await admin.pedir(`/api/programas/sessoes/${prog.sessoes[0].id}`, { metodo: 'DELETE' })).status, 409);
  } finally { s.fechar(); }
});
