import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirBanco } from '../src/db/conexao.js';
import { aplicarMigracoes, listarArquivos } from '../src/db/migracoes.js';

test('aplica todas as migrações num banco novo', () => {
  const db = abrirBanco(':memory:');
  const feitas = db.prepare('SELECT nome FROM _migracoes ORDER BY nome').all().map((r) => r.nome);
  assert.deepEqual(feitas, listarArquivos());
  assert.equal(db.prepare("SELECT valor FROM config WHERE chave = 'nome_app'").get().valor, 'SIMEAOBuddy');
});

test('rodar as migrações de novo não refaz nada', () => {
  const db = abrirBanco(':memory:');
  assert.deepEqual(aplicarMigracoes(db), []);
});

test('nomes das migrações seguem NNN_nome.sql e não repetem número', () => {
  const numeros = listarArquivos().map((f) => f.slice(0, 3));
  assert.equal(new Set(numeros).size, numeros.length);
});
