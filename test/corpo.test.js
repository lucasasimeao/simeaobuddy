// Etapa 6 de ponta a ponta: peso, medidas, fotos (com permissão) e os dados da Evolução.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { subirServidor, criarAdmin, criarAlunoGoogle, navegador } from './ajuda.js';
import { criarSessao } from '../src/auth/sessoes.js';
import { copiarPrograma } from '../src/db/programas.js';
import { hojeLocal } from '../src/db/treinos.js';

async function cenario() {
  const pastaFotos = mkdtempSync(join(tmpdir(), 'fotos-teste-'));
  const s = await subirServidor({ pastaFotos });
  const { usuario, senha } = criarAdmin(s.db);
  const admin = navegador(s.url);
  await admin.pedir('/api/auth/entrar', { metodo: 'POST', corpo: { usuario, senha } });
  const logar = (id) => {
    const nav = navegador(s.url);
    criarSessao(s.db, { headers: {} }, { cookie: (k, v) => nav.definirCookie(k, v) }, id);
    return nav;
  };
  const idAna = criarAlunoGoogle(s.db, 'Ana');
  const idBia = criarAlunoGoogle(s.db, 'Bia');
  const fechar = () => { s.fechar(); rmSync(pastaFotos, { recursive: true, force: true }); };
  return { s, admin, idAna, idBia, ana: logar(idAna), bia: logar(idBia), pastaFotos, fechar };
}

const ontem = () => new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');
// Menor JPEG válido que importa aqui: só a assinatura FF D8 FF + alguns bytes
const JPEG = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 0xff, 0xd9]).toString('base64')}`;

test('peso: registra hoje, corrige no mesmo dia, valida e não aceita data futura', async () => {
  const { ana, s, fechar } = await cenario();
  try {
    assert.equal((await ana.pedir('/api/corpo/peso', { metodo: 'PUT', corpo: { peso: '80,4' } })).status, 200);
    assert.equal((await ana.pedir('/api/corpo/peso', { metodo: 'PUT', corpo: { peso: 80.1 } })).status, 200);
    await ana.pedir('/api/corpo/peso', { metodo: 'PUT', corpo: { peso: 81, data: ontem() } });
    const r = (await ana.pedir('/api/corpo')).json;
    assert.deepEqual(r.pesos.map((p) => p.peso), [81, 80.1]);
    assert.equal(r.pesos[1].data, hojeLocal());
    assert.equal(r.avaliacao.ultimo.media, 80.55);
    assert.equal((await ana.pedir('/api/corpo/peso', { metodo: 'PUT', corpo: { peso: 20 } })).status, 400);
    assert.equal((await ana.pedir('/api/corpo/peso', { metodo: 'PUT', corpo: { peso: 80, data: '2999-01-01' } })).status, 400);
    await ana.pedir(`/api/corpo/peso/${ontem()}`, { metodo: 'DELETE' });
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM pesos').get().n, 1);
  } finally { fechar(); }
});

test('medidas: pelo menos uma, faixas válidas, uma por dia', async () => {
  const { ana, fechar } = await cenario();
  try {
    assert.equal((await ana.pedir('/api/corpo/medidas', { metodo: 'PUT', corpo: {} })).status, 400);
    assert.equal((await ana.pedir('/api/corpo/medidas', { metodo: 'PUT', corpo: { cintura: 5 } })).status, 400);
    assert.equal((await ana.pedir('/api/corpo/medidas', { metodo: 'PUT', corpo: { cintura: '80,5', braco: 31 } })).status, 200);
    assert.equal((await ana.pedir('/api/corpo/medidas', { metodo: 'PUT', corpo: { cintura: 80, gordura: 22 } })).status, 200);
    const { medidas } = (await ana.pedir('/api/corpo')).json;
    assert.equal(medidas.length, 1);
    assert.deepEqual([medidas[0].cintura, medidas[0].braco, medidas[0].gordura], [80, null, 22]);
  } finally { fechar(); }
});

test('fotos: só imagem de verdade; o dono e o admin veem, outro aluno não', async () => {
  const { ana, bia, admin, pastaFotos, idAna, fechar } = await cenario();
  try {
    const falsa = `data:image/jpeg;base64,${Buffer.from('não sou foto').toString('base64')}`;
    assert.equal((await ana.pedir('/api/corpo/fotos', { metodo: 'POST', corpo: { imagem: falsa } })).status, 400);
    assert.equal((await ana.pedir('/api/corpo/fotos', { metodo: 'POST', corpo: { imagem: 'data:text/html;base64,PGI+' } })).status, 400);
    const r = await ana.pedir('/api/corpo/fotos', { metodo: 'POST', corpo: { imagem: JPEG } });
    assert.equal(r.status, 201);
    assert.equal(readdirSync(join(pastaFotos, String(idAna))).length, 1);
    const url = `${'/api/corpo/fotos/'}${r.json.id}`;
    const foto = await ana.pedir(url);
    assert.equal(foto.status, 200);
    assert.equal(foto.headers.get('cache-control'), 'no-store'); // não fica no celular depois de sair da conta
    assert.equal((await admin.pedir(url)).status, 200);
    assert.equal((await bia.pedir(url)).status, 404);
    assert.equal((await bia.pedir(url, { metodo: 'DELETE' })).status, 404);
    assert.equal((await ana.pedir(url, { metodo: 'DELETE' })).status, 200);
    assert.equal(readdirSync(join(pastaFotos, String(idAna))).length, 0);
  } finally { fechar(); }
});

test('corpo e evolução: o aluno só vê o próprio; o admin escolhe com ?aluno_id=', async () => {
  const { ana, bia, admin, idAna, fechar } = await cenario();
  try {
    await ana.pedir('/api/corpo/peso', { metodo: 'PUT', corpo: { peso: 70 } });
    assert.equal((await bia.pedir(`/api/corpo?aluno_id=${idAna}`)).status, 403);
    assert.equal((await bia.pedir(`/api/evolucao?aluno_id=${idAna}`)).status, 403);
    assert.equal((await admin.pedir(`/api/corpo?aluno_id=${idAna}`)).json.pesos[0].peso, 70);
    assert.equal((await bia.pedir('/api/corpo')).json.pesos.length, 0);
  } finally { fechar(); }
});

test('evolução: tonelagem por treino, histórico por exercício com e1RM e status, micros', async () => {
  const { s, ana, idAna, admin, fechar } = await cenario();
  try {
    const modelo = s.db.prepare('SELECT id FROM programas WHERE aluno_id IS NULL').get().id;
    copiarPrograma(s.db, modelo, idAna);
    for (const reps of [8, 9]) {
      for (let k = 0; k < 5; k++) {
        const f = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
        for (const item of f.itens) {
          for (let p = 0; p < item.semana.series.length; p++) {
            const corpo = item.metodo === 'muscle_round' ? { item_id: item.id, posicao: p, bloco: 1, carga: 10, reps: 4 } : { item_id: item.id, posicao: p, carga: 50, reps };
            await ana.pedir(`/api/treinos/${f.treino.id}/series`, { metodo: 'PUT', corpo });
          }
        }
        await ana.pedir(`/api/treinos/${f.treino.id}/finalizar`, { metodo: 'POST', corpo: {} });
      }
    }
    const ev = (await ana.pedir('/api/evolucao')).json;
    assert.equal(ev.treinos.length, 10);
    assert.equal(ev.micros.length, 2);
    assert.equal(ev.micros[1].fadiga.nivel, 'baixa');
    const sup = ev.exercicios.find((e) => e.nome === 'Supino reto máquina');
    assert.equal(sup.historico.length, 2);
    assert.equal(sup.historico[0].status, null);
    assert.equal(sup.historico[1].status, 'progrediu');
    assert.equal(sup.historico[1].e1rm, 66.7); // 50 × (1 + (9 + 1)/30)
    assert.equal(sup.historico[1].carga, 50);
    assert.equal((await admin.pedir(`/api/evolucao?aluno_id=${idAna}`)).json.pessoa.nome, 'Ana');
  } finally { fechar(); }
});
