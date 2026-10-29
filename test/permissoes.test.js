import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, criarAdmin, criarAlunoGoogle, navegador } from './ajuda.js';
import { criarSessao } from '../src/auth/sessoes.js';

// Loga um aluno direto (simula o Google) e devolve o "navegador" dele
function logarComo(s, usuarioId) {
  const nav = navegador(s.url);
  const resFalso = { cookie: (k, v) => nav.definirCookie(k, v) };
  criarSessao(s.db, { headers: {} }, resFalso, usuarioId);
  return nav;
}

async function cenario() {
  const s = await subirServidor();
  const { usuario, senha } = criarAdmin(s.db);
  const admin = navegador(s.url);
  await admin.pedir('/api/auth/entrar', { metodo: 'POST', corpo: { usuario, senha } });
  const idA = criarAlunoGoogle(s.db, 'Ana');
  const idB = criarAlunoGoogle(s.db, 'Bruno');
  return { s, admin, idA, idB, ana: logarComo(s, idA) };
}

test('aluno A não vê os dados do aluno B', async () => {
  const { s, idA, idB, ana } = await cenario();
  try {
    assert.equal((await ana.pedir(`/api/alunos/${idA}`)).status, 200);
    const r = await ana.pedir(`/api/alunos/${idB}`);
    assert.equal(r.status, 403);
    assert.ok(r.json.erro);
  } finally { s.fechar(); }
});

test('aluno não lista alunos, não edita (nem a si mesmo) e não aprova ninguém', async () => {
  const { s, idA, idB, ana } = await cenario();
  try {
    assert.equal((await ana.pedir('/api/alunos')).status, 403);
    assert.equal((await ana.pedir(`/api/alunos/${idA}`, { metodo: 'PUT', corpo: { nome: 'Ana', anamnese: {} } })).status, 403);
    assert.equal((await ana.pedir(`/api/alunos/${idB}/status`, { metodo: 'POST', corpo: { status: 'inativo' } })).status, 403);
    assert.equal((await ana.pedir('/api/auth/senha', { metodo: 'PUT', corpo: { atual: 'x', nova: 'yyyyyyyy' } })).status, 403);
  } finally { s.fechar(); }
});

test('sem login, nada de dados', async () => {
  const { s, idA } = await cenario();
  try {
    const anonimo = navegador(s.url);
    assert.equal((await anonimo.pedir('/api/alunos')).status, 401);
    assert.equal((await anonimo.pedir(`/api/alunos/${idA}`)).status, 401);
  } finally { s.fechar(); }
});

test('admin lista (pendentes primeiro), edita a anamnese e o aluno vê o resultado', async () => {
  const { s, admin, idA, ana } = await cenario();
  try {
    criarAlunoGoogle(s.db, 'Zeca', 'pendente');
    const lista = (await admin.pedir('/api/alunos')).json.alunos;
    assert.equal(lista.length, 3);
    assert.equal(lista[0].nome, 'Zeca');

    const corpo = { nome: 'Ana Paula', anamnese: { objetivo: 'hipertrofia', nivel: 'intermediario', altura_cm: '165,5', dias_semana: 5 } };
    assert.equal((await admin.pedir(`/api/alunos/${idA}`, { metodo: 'PUT', corpo })).status, 200);
    const visto = (await ana.pedir(`/api/alunos/${idA}`)).json;
    assert.equal(visto.aluno.nome, 'Ana Paula');
    assert.equal(visto.anamnese.objetivo, 'hipertrofia');
    assert.equal(visto.anamnese.altura_cm, 165.5);
  } finally { s.fechar(); }
});

test('anamnese inválida volta com mensagem amigável', async () => {
  const { s, admin, idA } = await cenario();
  try {
    const r = await admin.pedir(`/api/alunos/${idA}`, { metodo: 'PUT', corpo: { nome: 'Ana', anamnese: { objetivo: 'ficar forte', altura_cm: 20 } } });
    assert.equal(r.status, 400);
    assert.match(r.json.erro, /Altura|Objetivo/);
  } finally { s.fechar(); }
});

test('desativar derruba o login do aluno; reativar libera de novo', async () => {
  const { s, admin, idA, ana } = await cenario();
  try {
    assert.equal((await admin.pedir(`/api/alunos/${idA}/status`, { metodo: 'POST', corpo: { status: 'inativo' } })).status, 200);
    assert.equal((await ana.pedir(`/api/alunos/${idA}`)).status, 401);
    await admin.pedir(`/api/alunos/${idA}/status`, { metodo: 'POST', corpo: { status: 'ativo' } });
    assert.equal(s.db.prepare('SELECT status FROM usuarios WHERE id = ?').get(idA).status, 'ativo');
  } finally { s.fechar(); }
});

test('o admin não aparece nem pode ser mexido pela rota de alunos', async () => {
  const { s, admin } = await cenario();
  try {
    const idAdmin = s.db.prepare("SELECT id FROM usuarios WHERE papel = 'admin'").get().id;
    assert.equal((await admin.pedir(`/api/alunos/${idAdmin}/status`, { metodo: 'POST', corpo: { status: 'inativo' } })).status, 404);
  } finally { s.fechar(); }
});
