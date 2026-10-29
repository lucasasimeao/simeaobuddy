import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { montarBiblioteca, FICHAS, TOTAL_PLANILHA, nomeBonito } from '../src/db/dados/biblioteca.js';
import { GRUPOS, EQUIPAMENTOS, normalizar } from '../src/treino/grupos.js';
import { subirServidor, criarAdmin, criarAlunoGoogle, navegador } from './ajuda.js';
import { criarSessao } from '../src/auth/sessoes.js';

const planilha = readFileSync(new URL('../docs/exercicios-da-planilha.txt', import.meta.url), 'utf8')
  .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

test('o seed tem os 170 exercícios da planilha, sem faltar nem sobrar', () => {
  assert.equal(planilha.length, 170);
  assert.equal(TOTAL_PLANILHA, 170);
  const chaves = new Set(montarBiblioteca().map((e) => e.chave));
  for (const nome of planilha) assert.ok(chaves.has(nome), `faltou "${nome}"`);
});

test('todas as fichas entram com vídeo, e nenhum nome se repete', () => {
  const lista = montarBiblioteca();
  const nomes = lista.map((e) => e.nome.toLowerCase());
  assert.equal(new Set(nomes).size, nomes.length, 'nome repetido');
  for (const f of FICHAS) {
    const e = lista.find((x) => x.nome === f.nome);
    assert.ok(e, `ficha "${f.nome}" não entrou`);
    assert.match(e.video_url, /^https:\/\/(youtu\.be|www\.youtube\.com)\//);
  }
});

test('todo exercício tem grupo, tipo, equipamento e incremento válidos', () => {
  for (const e of montarBiblioteca()) {
    assert.ok(GRUPOS[e.grupo_primario], `${e.nome}: grupo ${e.grupo_primario}`);
    assert.ok(['multi', 'isolado'].includes(e.tipo), e.nome);
    assert.ok(EQUIPAMENTOS[e.equipamento], `${e.nome}: equipamento ${e.equipamento}`);
    assert.ok(e.incremento_kg > 0, e.nome);
    for (const s of e.grupos_secundarios) {
      assert.ok(GRUPOS[s.grupo] && s.grupo !== e.grupo_primario, `${e.nome}: secundário ${s.grupo}`);
    }
  }
});

test('incrementos padrão do docs/03: barra 2,5 · halter 2 · máquina e polia 5', () => {
  const lista = montarBiblioteca();
  const de = (nome) => lista.find((e) => e.nome === nome);
  assert.equal(de('Supino reto barra').incremento_kg, 2.5);
  assert.equal(de('Supino reto halter').incremento_kg, 2);
  assert.equal(de('Supino reto máquina').incremento_kg, 5);
  assert.equal(de('Tríceps francês corda').incremento_kg, 5);
});

test('os 5 multiarticulares da escada estão marcados como estáveis de superiores', () => {
  const lista = montarBiblioteca();
  for (const nome of ['Supino reto máquina', 'T-bar row (apoio no peito)', 'Puxada alta pronada', 'Supino inclinado máquina', 'Puxada alta triângulo']) {
    const e = lista.find((x) => x.nome === nome);
    assert.ok(e, nome);
    assert.equal(e.tipo, 'multi', nome);
    assert.equal(e.estavel, true, nome);
    assert.equal(GRUPOS[e.grupo_primario].regiao, 'superior', nome);
  }
});

test('nomes da planilha ficam legíveis e a busca ignora acentos', () => {
  assert.equal(nomeBonito('TRICEPS FRANCES BARRA W'), 'Tríceps francês barra W');
  assert.equal(nomeBonito('MEIO TERRA (DORIAN YATES)'), 'Meio terra (Dorian Yates)');
  assert.equal(normalizar('  SUPINO   Inclinado MÁQUINA '), 'supino inclinado maquina');
});

// --- API ---
async function cenario() {
  const s = await subirServidor();
  const { usuario, senha } = criarAdmin(s.db);
  const admin = navegador(s.url);
  await admin.pedir('/api/auth/entrar', { metodo: 'POST', corpo: { usuario, senha } });
  const aluno = navegador(s.url);
  criarSessao(s.db, { headers: {} }, { cookie: (k, v) => aluno.definirCookie(k, v) }, criarAlunoGoogle(s.db, 'Ana'));
  return { s, admin, aluno };
}

const novo = {
  nome: 'Crucifixo teste', grupo_primario: 'peito', tipo: 'isolado', equipamento: 'polia', incremento_kg: 5,
  grupos_secundarios: [{ grupo: 'ombro_anterior', fracao: 0.5 }], video_url: 'https://youtu.be/abc', substitutos: [],
};

test('banco novo já vem com a biblioteca; busca sem acento e por apelido', async () => {
  const { s, aluno } = await cenario();
  try {
    const todos = (await aluno.pedir('/api/exercicios')).json.exercicios;
    assert.equal(todos.length, montarBiblioteca().length);

    const busca = (await aluno.pedir(`/api/exercicios?busca=${encodeURIComponent('supino inclinado maquina')}`)).json.exercicios;
    assert.ok(busca.some((e) => e.nome === 'Supino inclinado máquina'));
    assert.ok(busca.every((e) => normalizar(e.nome + ' ' + (e.apelidos || '')).includes('inclinado')));

    const apelido = (await aluno.pedir('/api/exercicios?busca=voador%20maquina')).json.exercicios;
    assert.ok(apelido.some((e) => e.nome === 'Crucifixo máquina'), 'acha pelo nome antigo da planilha');
  } finally { s.fechar(); }
});

test('filtro por grupo: o grupo principal vem primeiro, depois quem treina o grupo de forma indireta', async () => {
  const { s, aluno } = await cenario();
  try {
    const lista = (await aluno.pedir('/api/exercicios?grupo=triceps')).json.exercicios;
    const primeiroIndireto = lista.findIndex((e) => e.grupo_primario !== 'triceps');
    assert.ok(primeiroIndireto > 0);
    assert.ok(lista.slice(0, primeiroIndireto).every((e) => e.grupo_primario === 'triceps'));
    assert.ok(lista.slice(primeiroIndireto).every((e) => e.grupos_secundarios.some((g) => g.grupo === 'triceps')));
  } finally { s.fechar(); }
});

test('detalhe traz os substitutos com nome', async () => {
  const { s, aluno } = await cenario();
  try {
    const { exercicios: [hack] } = (await aluno.pedir('/api/exercicios?busca=hack')).json;
    const { exercicio } = (await aluno.pedir(`/api/exercicios/${hack.id}`)).json;
    assert.deepEqual(exercicio.substitutos_info.map((x) => x.nome), ['Agachamento Smith', 'Agachamento livre']);
  } finally { s.fechar(); }
});

test('admin cria, edita e desativa; o desativado some para o aluno', async () => {
  const { s, admin, aluno } = await cenario();
  try {
    const criado = await admin.pedir('/api/exercicios', { metodo: 'POST', corpo: novo });
    assert.equal(criado.status, 201);
    const id = criado.json.exercicio.id;

    assert.equal((await admin.pedir('/api/exercicios', { metodo: 'POST', corpo: novo })).status, 409, 'nome repetido');

    const editado = await admin.pedir(`/api/exercicios/${id}`, { metodo: 'PUT', corpo: { ...novo, nome: 'Crucifixo teste 2', substitutos: [id, 1] } });
    assert.equal(editado.status, 200);
    assert.deepEqual(editado.json.exercicio.substitutos, [1], 'não vira substituto de si mesmo');

    await admin.pedir(`/api/exercicios/${id}/ativo`, { metodo: 'POST', corpo: { ativo: false } });
    assert.equal((await aluno.pedir(`/api/exercicios/${id}`)).status, 404);
    assert.ok(!(await aluno.pedir('/api/exercicios?busca=teste')).json.exercicios.length);
    assert.ok((await admin.pedir('/api/exercicios?busca=teste&inativos=1')).json.exercicios.length);
  } finally { s.fechar(); }
});

test('aluno não cria nem edita exercício', async () => {
  const { s, aluno } = await cenario();
  try {
    assert.equal((await aluno.pedir('/api/exercicios', { metodo: 'POST', corpo: novo })).status, 403);
    assert.equal((await aluno.pedir('/api/exercicios/1', { metodo: 'PUT', corpo: novo })).status, 403);
    assert.equal((await aluno.pedir('/api/exercicios/1/ativo', { metodo: 'POST', corpo: { ativo: false } })).status, 403);
  } finally { s.fechar(); }
});

test('dados inválidos voltam com mensagem amigável', async () => {
  const { s, admin } = await cenario();
  try {
    const casos = [
      [{ ...novo, grupo_primario: 'pescoco' }, /grupo/i],
      [{ ...novo, video_url: 'javascript:alert(1)' }, /vídeo/i],
      [{ ...novo, incremento_kg: 0 }, /Incremento/],
      [{ ...novo, grupos_secundarios: [{ grupo: 'peito', fracao: 0.5 }] }, /repetido/],
      [{ ...novo, substitutos: [99999] }, /não existe/],
    ];
    for (const [corpo, msg] of casos) {
      const r = await admin.pedir('/api/exercicios', { metodo: 'POST', corpo });
      assert.equal(r.status, 400, JSON.stringify(corpo));
      assert.match(r.json.erro, msg);
    }
  } finally { s.fechar(); }
});
