// Regras puras da Etapa 4: sequência dos treinos, tonelagem, carga utilizada e back-off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proximoTreino, microcicloParaSessao, semanaDaEscada, microcicloAtual } from '../src/treino/sequencia.js';
import { tonelagem, totalReps, cargaUtilizada, cargaBackoff, variacao } from '../src/treino/tonelagem.js';

const S = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]; // A..E
const feito = (sessao_id, microciclo) => ({ sessao_id, microciclo });

test('sequência: começa no A do micro 1', () => {
  assert.deepEqual(proximoTreino(S, []), { sessao_id: 1, microciclo: 1 });
});

test('sequência: o próximo que falta no microciclo atual', () => {
  assert.deepEqual(proximoTreino(S, [feito(1, 1), feito(2, 1)]), { sessao_id: 3, microciclo: 1 });
  // pulou o B: o B é o que falta
  assert.deepEqual(proximoTreino(S, [feito(1, 1), feito(3, 1)]), { sessao_id: 2, microciclo: 1 });
});

test('sequência: fechou os 5 → A do microciclo seguinte', () => {
  const todos = S.map((s) => feito(s.id, 1));
  assert.deepEqual(proximoTreino(S, todos), { sessao_id: 1, microciclo: 2 });
});

test('escolher outro treino: entra no micro atual, ou no próximo se já fez nele', () => {
  const f = [feito(1, 2), feito(2, 2)];
  assert.equal(microcicloParaSessao(4, f), 2);
  assert.equal(microcicloParaSessao(1, f), 3);
  assert.equal(microcicloParaSessao(3, []), 1);
  assert.equal(microcicloAtual([]), 1);
});

test('depois da semana 3 o bloco se repete (micro 4 = semana 1 da escada)', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((m) => semanaDaEscada(m, 3)), [1, 2, 3, 1, 2, 3, 1]);
});

const series = [
  { tipo: 'ws', carga: 60, reps: 8 },
  { tipo: 'top', carga: 62.5, reps: 7 },
  { tipo: 'bo', carga: 50, reps: 9 },
];

test('tonelagem = Σ reps × kg das séries válidas', () => {
  assert.equal(tonelagem(series), 60 * 8 + 62.5 * 7 + 50 * 9); // 1367,5
  assert.equal(totalReps(series), 24);
  assert.equal(tonelagem([]), 0);
  assert.equal(tonelagem([{ tipo: 'muscle_round', carga: 10, reps: 4 }, { tipo: 'muscle_round', carga: 10, reps: 3 }]), 70);
});

test('tonelagem ignora séries sem kg ou reps', () => {
  assert.equal(tonelagem([...series, { tipo: 'ws', carga: null, reps: 8 }]), 1367.5);
});

test('carga utilizada = carga do top set (sem top: a maior, sem contar o BO)', () => {
  assert.equal(cargaUtilizada(series), 62.5);
  assert.equal(cargaUtilizada([{ tipo: 'ws', carga: 40, reps: 8 }, { tipo: 'bo', carga: 80, reps: 8 }]), 40);
  assert.equal(cargaUtilizada([]), null);
});

test('back-off = −20% do top, arredondado ao incremento', () => {
  assert.equal(cargaBackoff(62.5, 20, 2.5), 50);
  assert.equal(cargaBackoff(70, 20, 5), 55); // 56 → 55
  assert.equal(cargaBackoff(17, 20, 2), 14); // 13,6 → 14
  assert.equal(cargaBackoff(0, 20, 5), null);
});

test('variação % (sem base = null)', () => {
  assert.equal(variacao(110, 100), 10);
  assert.equal(variacao(95, 100), -5);
  assert.equal(variacao(100, null), null);
  assert.equal(variacao(100, 0), null);
});
