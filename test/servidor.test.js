import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirBanco } from '../src/db/conexao.js';
import { criarApp } from '../src/app.js';

async function comServidor(fn) {
  const servidor = criarApp(abrirBanco(':memory:')).listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  try {
    await fn(`http://127.0.0.1:${servidor.address().port}`);
  } finally {
    servidor.close();
  }
}

test('GET /api/saude responde ok', () =>
  comServidor(async (url) => {
    const r = await fetch(`${url}/api/saude`);
    assert.equal(r.status, 200);
    const dados = await r.json();
    assert.equal(dados.ok, true);
    assert.equal(dados.app, 'SIMEAOBuddy');
  }));

test('rota de API inexistente devolve 404 com mensagem', () =>
  comServidor(async (url) => {
    const r = await fetch(`${url}/api/nao-existe`);
    assert.equal(r.status, 404);
    assert.ok((await r.json()).erro);
  }));

test('cabeçalhos de segurança em toda resposta; API sem cache', () =>
  comServidor(async (url) => {
    const pagina = await fetch(url);
    assert.match(pagina.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.match(pagina.headers.get('content-security-policy'), /script-src 'self'(;|$)/);
    assert.equal(pagina.headers.get('x-frame-options'), 'DENY');
    assert.equal(pagina.headers.get('x-content-type-options'), 'nosniff');
    const api = await fetch(`${url}/api/saude`);
    assert.equal(api.headers.get('cache-control'), 'no-store');
  }));

test('serve o assetlinks.json do app Android', () =>
  comServidor(async (url) => {
    const r = await fetch(`${url}/.well-known/assetlinks.json`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /application\/json/);
    const [ligacao] = await r.json();
    assert.equal(ligacao.target.package_name, 'com.simeaobuddy.app');
  }));

test('serve a página inicial', () =>
  comServidor(async (url) => {
    const r = await fetch(url);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /SIMEAOBuddy/);
  }));
