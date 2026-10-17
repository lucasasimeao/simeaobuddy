import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirBanco } from '../src/db/conexao.js';
import { carregarPrograma } from '../src/db/programas.js';
import { descreverSemana } from '../src/treino/escada.js';
import { NOME_MODELO } from '../src/db/dados/modelo.js';
import { subirServidor, criarAdmin, criarAlunoGoogle, navegador } from './ajuda.js';
import { criarSessao } from '../src/auth/sessoes.js';

function modelo(db) {
  const { id } = db.prepare('SELECT id FROM programas WHERE aluno_id IS NULL').get();
  return carregarPrograma(db, id);
}
const escadaDe = (p, nome, codigo) => {
  const sessao = p.sessoes.find((s) => !codigo || s.codigo === codigo);
  const item = (codigo ? sessao.itens : p.sessoes.flatMap((s) => s.itens)).find((i) => i.exercicio.nome === nome);
  assert.ok(item, `faltou ${nome}`);
  return item.semanas.map(descreverSemana);
};

test('modelo pronto: 5 treinos (A Push, B Pull, C Lower I, D Upper, E Lower) com 32 exercícios', () => {
  const p = modelo(abrirBanco(':memory:'));
  assert.equal(p.programa.nome, NOME_MODELO);
  assert.equal(p.programa.n_microciclos, 3);
  assert.deepEqual(p.sessoes.map((s) => `${s.codigo} ${s.nome}`), ['A Push', 'B Pull', 'C Lower I', 'D Upper', 'E Lower']);
  assert.deepEqual(p.sessoes.map((s) => s.itens.length), [6, 7, 6, 7, 6]);
});

test('modelo: os 5 multiarticulares estáveis fazem 2 → 3 → 3 WS (T-bar: 2 → 3 → 2 + BO, como no PDF)', () => {
  const p = modelo(abrirBanco(':memory:'));
  for (const nome of ['Supino reto máquina', 'Puxada alta pronada', 'Supino inclinado máquina', 'Puxada alta triângulo']) {
    assert.deepEqual(escadaDe(p, nome), ['2 WS', '3 WS', '3 WS'], nome);
  }
  assert.deepEqual(escadaDe(p, 'T-bar row (apoio no peito)'), ['2 WS', '3 WS', '2 WS + 1 BO']);
});

test('modelo: BO na S3 dos isolados de superiores; exceções com 3 WS na S2', () => {
  const p = modelo(abrirBanco(':memory:'));
  for (const nome of ['Crucifixo polia alta', 'Elevação lateral máquina', 'Tríceps francês corda', 'Rosca scott máquina', 'Kelso shrugs']) {
    assert.deepEqual(escadaDe(p, nome), ['2 WS', '2 WS', '2 WS + 1 BO'], nome);
  }
  for (const nome of ['Crucifixo na polia baixa', 'Remada baixa unilateral neutra', 'Crucifixo máquina']) {
    assert.deepEqual(escadaDe(p, nome), ['2 WS', '3 WS', '2 WS + 1 BO'], nome);
  }
});

test('modelo: inferiores e abdômen fixos; mesa flexora e búlgaro só 1 TOP; Muscle Round no Upper', () => {
  const p = modelo(abrirBanco(':memory:'));
  for (const nome of ['Agachamento hack 45', 'Stiff', 'Leg press 45', 'Banco solear', 'Abdômen polia alta']) {
    assert.deepEqual(escadaDe(p, nome), ['2 WS', '2 WS', '2 WS'], nome);
  }
  assert.deepEqual(escadaDe(p, 'Mesa flexora'), ['1 TOP', '1 TOP', '1 TOP']);
  assert.deepEqual(escadaDe(p, 'Búlgaro no smith'), ['1 TOP', '1 TOP', '1 TOP']);
  const upper = p.sessoes.find((s) => s.codigo === 'D');
  const mr = upper.itens.filter((i) => i.metodo === 'muscle_round');
  assert.equal(mr.length, 3);
  for (const i of mr) {
    assert.deepEqual([i.mr_blocos, i.mr_reps, i.mr_descanso_seg], [4, 4, 10]);
    assert.deepEqual(i.semanas.map(descreverSemana), ['1 MR', '1 MR', '1 MR']);
  }
});

test('modelo: descansos, faixas e feeders das fichas', () => {
  const p = modelo(abrirBanco(':memory:'));
  const item = (nome) => p.sessoes.flatMap((s) => s.itens).find((i) => i.exercicio.nome === nome);
  assert.equal(item('Puxada alta pronada').descanso_seg, 150);
  for (const n of ['Agachamento hack 45', 'Elevação pélvica máquina', 'Stiff', 'Leg press 45', 'Búlgaro no smith']) assert.equal(item(n).descanso_seg, 180, n);
  assert.equal(item('Supino reto máquina').descanso_seg, 120);
  assert.deepEqual([item('Crucifixo polia alta').reps_min, item('Crucifixo polia alta').reps_max], [8, 10]);
  assert.deepEqual([item('Elevação lateral máquina').reps_min, item('Elevação lateral máquina').reps_max], [7, 9]);
  assert.equal(item('Supino reto máquina').cadencia, '2-0-1-0');
  assert.deepEqual(item('Supino reto máquina').feeders_efetivas.map((f) => f.pct), [50, 75, 90]);
  assert.deepEqual(item('Crucifixo na polia baixa').feeders_efetivas, [{ reps: '3–4', pct: 80, descanso: 45 }]);
  assert.deepEqual(item('Tríceps de costas para a polia (barra W)').feeders_efetivas.map((f) => f.pct), [90]);
});

test('modelo: warm-up no 1º exercício de cada grupo (Push: supino sim, crucifixos não)', () => {
  const push = modelo(abrirBanco(':memory:')).sessoes[0];
  assert.deepEqual(push.itens.map((i) => i.tem_warmup), [true, false, false, true, true, true]);
});

test('o modelo não é recriado quando já existe', () => {
  const db = abrirBanco(':memory:');
  assert.equal(db.prepare('SELECT count(*) AS n FROM programas WHERE aluno_id IS NULL').get().n, 1);
});

// --- API ---
async function cenario() {
  const s = await subirServidor();
  const { usuario, senha } = criarAdmin(s.db);
  const admin = navegador(s.url);
  await admin.pedir('/api/auth/entrar', { metodo: 'POST', corpo: { usuario, senha } });
  const idAna = criarAlunoGoogle(s.db, 'Ana');
  const idBia = criarAlunoGoogle(s.db, 'Bia');
  const logar = (id) => {
    const nav = navegador(s.url);
    criarSessao(s.db, { headers: {} }, { cookie: (k, v) => nav.definirCookie(k, v) }, id);
    return nav;
  };
  const idModelo = s.db.prepare('SELECT id FROM programas WHERE aluno_id IS NULL').get().id;
  return { s, admin, idAna, idBia, ana: logar(idAna), bia: logar(idBia), idModelo };
}

test('copiar o modelo para um aluno: vira ativo, igual ao modelo, e editar a cópia não mexe no modelo', async () => {
  const { s, admin, idAna, idModelo } = await cenario();
  try {
    const r = await admin.pedir(`/api/programas/${idModelo}/copiar`, { metodo: 'POST', corpo: { aluno_id: idAna } });
    assert.equal(r.status, 201);
    assert.equal(r.json.programa.status, 'ativo');
    assert.equal(r.json.programa.aluno_id, idAna);
    assert.deepEqual(r.json.sessoes.map((x) => x.itens.length), [6, 7, 6, 7, 6]);

    const supino = r.json.sessoes[0].itens[0];
    const semanas = supino.semanas.map((w) => ({ ...w, n_ws: 3 }));
    assert.equal((await admin.pedir(`/api/programas/itens/${supino.id}/semanas`, { metodo: 'PUT', corpo: { semanas } })).status, 200);
    const original = (await admin.pedir(`/api/programas/${idModelo}`)).json;
    assert.deepEqual(original.sessoes[0].itens[0].semanas.map(descreverSemana), ['2 WS', '3 WS', '3 WS']);

    // 2ª cópia para a mesma pessoa entra como rascunho (já tem um ativo)
    const r2 = await admin.pedir(`/api/programas/${idModelo}/copiar`, { metodo: 'POST', corpo: { aluno_id: idAna } });
    assert.equal(r2.json.programa.status, 'rascunho');
    // ativar a 2ª arquiva a 1ª
    await admin.pedir(`/api/programas/${r2.json.programa.id}/status`, { metodo: 'POST', corpo: { status: 'ativo' } });
    assert.equal(s.db.prepare('SELECT status FROM programas WHERE id = ?').get(r.json.programa.id).status, 'arquivado');
  } finally { s.fechar(); }
});

test('o admin também pode ter programa próprio', async () => {
  const { s, admin, idModelo } = await cenario();
  try {
    const idAdmin = s.db.prepare("SELECT id FROM usuarios WHERE papel = 'admin'").get().id;
    const pessoas = (await admin.pedir('/api/programas/pessoas')).json.pessoas;
    assert.equal(pessoas[0].id, idAdmin);
    await admin.pedir(`/api/programas/${idModelo}/copiar`, { metodo: 'POST', corpo: { aluno_id: idAdmin } });
    const meu = (await admin.pedir('/api/programas/meu')).json;
    assert.equal(meu.programa.aluno_id, idAdmin);
  } finally { s.fechar(); }
});

test('aluno vê só o próprio programa e não edita nada', async () => {
  const { s, admin, idAna, ana, bia, idModelo } = await cenario();
  try {
    const p = (await admin.pedir(`/api/programas/${idModelo}/copiar`, { metodo: 'POST', corpo: { aluno_id: idAna } })).json;
    const pid = p.programa.id;
    assert.equal((await ana.pedir(`/api/programas/${pid}`)).status, 200);
    assert.equal((await ana.pedir('/api/programas/meu')).json.programa.id, pid);
    assert.equal((await bia.pedir(`/api/programas/${pid}`)).status, 404, 'Bia não vê o da Ana');
    assert.equal((await bia.pedir('/api/programas/meu')).json.programa, null);
    assert.equal((await ana.pedir(`/api/programas/${idModelo}`)).status, 404, 'aluno não vê o modelo');
    assert.equal((await ana.pedir('/api/programas')).status, 403);
    const item = p.sessoes[0].itens[0];
    assert.equal((await ana.pedir(`/api/programas/itens/${item.id}/semanas`, { metodo: 'PUT', corpo: { semanas: [] } })).status, 403);
    assert.equal((await ana.pedir(`/api/programas/itens/${item.id}`, { metodo: 'DELETE' })).status, 403);
  } finally { s.fechar(); }
});

test('montar do zero: treino, exercício com padrões, mover, editar e apagar', async () => {
  const { s, admin, idBia } = await cenario();
  try {
    let p = (await admin.pedir('/api/programas', { metodo: 'POST', corpo: { nome: 'Full body', n_microciclos: 3, aluno_id: idBia } })).json;
    const pid = p.programa.id;
    p = (await admin.pedir(`/api/programas/${pid}/sessoes`, { metodo: 'POST', corpo: { codigo: 'a', nome: 'Full' } })).json;
    const sid = p.sessoes[0].id;
    assert.equal(p.sessoes[0].codigo, 'A');

    const id = (nome) => s.db.prepare('SELECT id FROM exercicios WHERE nome = ?').get(nome).id;
    await admin.pedir(`/api/programas/sessoes/${sid}/itens`, { metodo: 'POST', corpo: { exercicio_id: id('Supino reto máquina') } });
    await admin.pedir(`/api/programas/sessoes/${sid}/itens`, { metodo: 'POST', corpo: { exercicio_id: id('Supino reto barra') } });
    p = (await admin.pedir(`/api/programas/sessoes/${sid}/itens`, { metodo: 'POST', corpo: { exercicio_id: id('Agachamento hack 45') } })).json;
    const [sup, supBarra, hack] = p.sessoes[0].itens;
    assert.equal(sup.papel, 'principal');
    assert.equal(supBarra.papel, 'secundario', '2º multi do mesmo grupo');
    assert.equal(hack.descanso_seg, 180);
    assert.deepEqual(sup.semanas.map(descreverSemana), ['2 WS', '3 WS', '3 WS']);
    assert.deepEqual(supBarra.semanas.map(descreverSemana), ['2 WS', '2 WS', '2 WS + 1 BO']);

    p = (await admin.pedir(`/api/programas/itens/${hack.id}/mover`, { metodo: 'POST', corpo: { direcao: -1 } })).json;
    assert.deepEqual(p.sessoes[0].itens.map((i) => i.id), [sup.id, hack.id, supBarra.id]);

    const editar = { ...sup, papel: 'secundario', reps_min: 6, reps_max: 10, descanso_seg: 90 };
    p = (await admin.pedir(`/api/programas/itens/${sup.id}`, { metodo: 'PUT', corpo: editar })).json;
    assert.equal(p.sessoes[0].itens[0].reps_max, 10);

    assert.equal((await admin.pedir(`/api/programas/itens/${sup.id}`, { metodo: 'PUT', corpo: { ...editar, reps_min: 12 } })).status, 400);

    p = (await admin.pedir(`/api/programas/itens/${supBarra.id}`, { metodo: 'DELETE' })).json;
    assert.equal(p.sessoes[0].itens.length, 2);

    // aumentar para 6 semanas repete o bloco
    p = (await admin.pedir(`/api/programas/${pid}`, { metodo: 'PUT', corpo: { nome: 'Full body', n_microciclos: 6 } })).json;
    assert.deepEqual(p.sessoes[0].itens[0].semanas.map(descreverSemana), ['2 WS', '3 WS', '3 WS', '2 WS', '3 WS', '3 WS']);
  } finally { s.fechar(); }
});

test('escada inválida volta com mensagem amigável', async () => {
  const { s, admin, idModelo } = await cenario();
  try {
    const item = (await admin.pedir(`/api/programas/${idModelo}`)).json.sessoes[0].itens[0];
    const base = item.semanas[0];
    const casos = [
      [{ ...base, n_ws: 9 }, /WS/],
      [{ ...base, n_top: 0, n_bo: 1 }, /TOP/],
      [{ ...base, microciclo: 5 }, /semanas/],
    ];
    for (const [semana, msg] of casos) {
      const r = await admin.pedir(`/api/programas/itens/${item.id}/semanas`, { metodo: 'PUT', corpo: { semanas: [semana] } });
      assert.equal(r.status, 400);
      assert.match(r.json.erro, msg);
    }
  } finally { s.fechar(); }
});
