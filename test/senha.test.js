import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarHash, conferirSenha, senhaValida } from '../src/auth/senha.js';

test('hash confere com a senha certa e recusa a errada', () => {
  const h = gerarHash('minha-senha-1');
  assert.match(h, /^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
  assert.equal(conferirSenha('minha-senha-1', h), true);
  assert.equal(conferirSenha('minha-senha-2', h), false);
});

test('mesma senha gera hashes diferentes (sal)', () => {
  assert.notEqual(gerarHash('abcdefgh'), gerarHash('abcdefgh'));
});

test('hash vazio ou estranho nunca confere', () => {
  assert.equal(conferirSenha('x', null), false);
  assert.equal(conferirSenha('x', 'lixo'), false);
});

test('senha precisa ter 8+ caracteres', () => {
  assert.equal(senhaValida('1234567'), false);
  assert.equal(senhaValida('12345678'), true);
});
