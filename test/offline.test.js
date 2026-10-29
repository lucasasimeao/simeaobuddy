import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chaveDe, pedidoDe, aplicarPendentes, ehSemRede } from '../public/js/offline-regras.js';
import { subirServidor } from './ajuda.js';

const ficha = () => ({
  treino: { id: 5, status: 'em_andamento', observacao: null },
  itens: [
    { id: 10, semana: { series: [{ tipo: 'ws' }, { tipo: 'top' }] }, registradas: [{ posicao: 0, bloco: 0, tipo: 'ws', carga: 50, reps: 8, uuid: 'a' }] },
    { id: 11, semana: { series: [{ tipo: 'ws' }] }, registradas: [] },
  ],
});

test('fila: a mesma série tem a mesma chave (a nova substitui a antiga)', () => {
  assert.equal(chaveDe({ tipo: 'serie', treino_id: 5, item_id: 10, posicao: 1, bloco: 0 }), '5:10:1:0');
  assert.equal(chaveDe({ tipo: 'apagar', treino_id: 5, item_id: 10, posicao: 1, bloco: 0 }), '5:10:1:0');
  assert.equal(chaveDe({ tipo: 'finalizar', treino_id: 5 }), '5:finalizar');
});

test('fila: cada operação vira o pedido certo', () => {
  assert.deepEqual(pedidoDe({ tipo: 'serie', treino_id: 5, corpo: { item_id: 10 } }), { caminho: '/treinos/5/series', metodo: 'PUT', corpo: { item_id: 10 } });
  assert.deepEqual(pedidoDe({ tipo: 'apagar', treino_id: 5, item_id: 10, posicao: 1, bloco: 2 }),
    { caminho: '/treinos/5/series?item_id=10&posicao=1&bloco=2', metodo: 'DELETE' });
  assert.deepEqual(pedidoDe({ tipo: 'finalizar', treino_id: 5, corpo: { observacao: 'x' } }), { caminho: '/treinos/5/finalizar', metodo: 'POST', corpo: { observacao: 'x' } });
  assert.throws(() => pedidoDe({ tipo: 'outro', treino_id: 5 }));
});

test('fila: a ficha guardada mostra o que ainda não subiu', () => {
  const original = ficha();
  const f = aplicarPendentes(original, [
    { tipo: 'serie', treino_id: 5, item_id: 10, posicao: 0, bloco: 0, corpo: { carga: 52.5, reps: 7, uuid: 'b' } }, // corrige
    { tipo: 'serie', treino_id: 5, item_id: 10, posicao: 1, bloco: 0, corpo: { carga: 55, reps: 6, uuid: 'c' } }, // nova
    { tipo: 'serie', treino_id: 9, item_id: 11, posicao: 0, bloco: 0, corpo: { carga: 1, reps: 1 } }, // de outro treino
    { tipo: 'finalizar', treino_id: 5, corpo: { observacao: 'Sem internet hoje' } },
  ]);
  const [a, b] = f.itens;
  assert.equal(a.registradas.length, 2);
  assert.deepEqual(a.registradas.find((s) => s.posicao === 0), { posicao: 0, bloco: 0, tipo: 'ws', carga: 52.5, reps: 7, uuid: 'b', pendente: true });
  assert.equal(a.registradas.find((s) => s.posicao === 1).tipo, 'top');
  assert.equal(b.registradas.length, 0);
  assert.equal(f.treino.status, 'finalizado');
  assert.equal(f.treino.observacao, 'Sem internet hoje');
  assert.equal(original.itens[0].registradas[0].carga, 50, 'não mexe na ficha original');
  assert.equal(original.treino.status, 'em_andamento');

  const apagada = aplicarPendentes(original, [{ tipo: 'apagar', treino_id: 5, item_id: 10, posicao: 0, bloco: 0 }]);
  assert.equal(apagada.itens[0].registradas.length, 0);
});

test('fila: só erro de rede segura a operação', () => {
  assert.equal(ehSemRede({ offline: true }), true);
  assert.equal(ehSemRede({ status: 400 }), false);
  assert.equal(ehSemRede(null), false);
});

test('PWA: /sw.js lista os arquivos do app, sem cache, e todos existem no servidor', async () => {
  const s = await subirServidor();
  try {
    const r = await fetch(`${s.url}/sw.js`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /javascript/);
    assert.equal(r.headers.get('cache-control'), 'no-cache');
    const codigo = await r.text();
    const versao = codigo.match(/const VERSAO = "([0-9a-f]{12})"/)?.[1];
    assert.ok(versao, 'versão preenchida');
    const urls = JSON.parse(codigo.match(/const ARQUIVOS = (\[[\s\S]*?\]);/)[1]);
    for (const u of ['/index.html', '/js/app.js', '/js/offline.js', '/js/telas/treino.js', '/css/tema.css', '/js/treino/escada.js', '/vendor/chart.umd.js', '/manifest.webmanifest', '/icone-192.png']) {
      assert.ok(urls.includes(u), `${u} está na lista`);
    }
    // O celular baixa todos de uma vez: se um faltar, a instalação falha
    for (const u of urls) assert.equal((await fetch(s.url + u)).status, 200, u);
    assert.equal((await (await fetch(`${s.url}/sw.js`)).text()).match(/const VERSAO = "(\w+)"/)[1], versao, 'mesma versão sem mudar arquivo');
  } finally {
    s.fechar();
  }
});

test('PWA: manifest com nome, tela cheia e ícones', async () => {
  const s = await subirServidor();
  try {
    const r = await fetch(`${s.url}/manifest.webmanifest`);
    assert.equal(r.status, 200);
    const m = await r.json();
    assert.equal(m.name, 'SIMEAOBuddy');
    assert.equal(m.display, 'standalone');
    assert.equal(m.background_color, '#0A0A0A');
    assert.ok(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
    for (const i of m.icons) assert.equal((await fetch(s.url + i.src)).status, 200, i.src);
    const html = await (await fetch(`${s.url}/`)).text();
    assert.match(html, /rel="manifest"/);
    assert.match(html, /apple-touch-icon/);
  } finally {
    s.fechar();
  }
});
