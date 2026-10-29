// Regras puras da Etapa 5: status de progressão, sugestão de carga, e1RM, fadiga, deload e check-in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { e1rm, melhorE1rm, statusProgressao, desvioFaixa, compararExercicio, sugestaoCarga, tonelagemPorSerie } from '../src/treino/progressao.js';
import { analisarMicro, sugerirDeload, seriesNoDeload, LIMITES } from '../src/treino/fadiga.js';
import { semanaIso, mediaCheckin } from '../src/treino/checkin.js';

const ws = (carga, reps, rir = 1) => ({ tipo: 'ws', carga, reps, rir });
const top = (carga, reps, rir = 0) => ({ tipo: 'top', carga, reps, rir });
const bo = (carga, reps) => ({ tipo: 'bo', carga, reps, rir: null });
const mr = (carga, reps) => ({ tipo: 'muscle_round', carga, reps, rir: null });
const faixa = { reps_min: 6, reps_max: 8 };

test('e1RM = kg × (1 + (reps + RIR) / 30)', () => {
  assert.equal(e1rm(100, 8, 2), 133.3);
  assert.equal(e1rm(60, 10), 80);
  assert.equal(e1rm(0, 10), null);
  assert.equal(melhorE1rm([ws(60, 8), top(62.5, 7), bo(50, 9)]), 78); // WS 60 × (1 + (8 + 1)/30) ganha do TOP (77,1)
  assert.equal(melhorE1rm([]), null);
});

test('status: subiu a carga → progrediu', () => {
  assert.equal(statusProgressao([ws(62.5, 6), top(62.5, 6)], [ws(60, 8), top(60, 8)], faixa), 'progrediu');
});

test('status: mesma carga com mais reps → progrediu; tudo igual → manteve', () => {
  assert.equal(statusProgressao([ws(60, 8), top(60, 8)], [ws(60, 7), top(60, 7)], faixa), 'progrediu');
  assert.equal(statusProgressao([ws(60, 7), top(60, 7)], [ws(60, 7), top(60, 7)], faixa), 'manteve');
});

test('status: mesma carga com menos reps → regrediu', () => {
  assert.equal(statusProgressao([ws(60, 6), top(60, 6)], [ws(60, 7), top(60, 7)], faixa), 'regrediu');
});

test('status: caiu a carga e a tonelagem → regrediu; caiu a carga mas a tonelagem por série não → manteve', () => {
  assert.equal(statusProgressao([ws(55, 7), top(55, 7)], [ws(60, 7), top(60, 7)], faixa), 'regrediu');
  assert.equal(statusProgressao([ws(55, 8), top(55, 8)], [ws(60, 7), top(60, 7)], faixa), 'manteve'); // 440 > 420
});

test('status: TOP abaixo do mínimo da faixa → regrediu (mesmo subindo a carga)', () => {
  assert.equal(statusProgressao([ws(70, 5), top(70, 5)], [ws(60, 8), top(60, 8)], faixa), 'regrediu');
});

test('status: a escada (2 → 3 séries) e o BO da S3 não mudam o status sozinhos', () => {
  const s1 = [ws(60, 7), top(60, 7)];
  assert.equal(statusProgressao([ws(60, 7), ws(60, 7), top(60, 7)], s1, faixa), 'manteve');
  assert.equal(statusProgressao([ws(60, 7), top(60, 7), bo(47.5, 8)], s1, faixa), 'manteve');
  assert.equal(tonelagemPorSerie([ws(60, 7), top(60, 7), bo(47.5, 8)]), 420);
});

test('status: sem base de comparação → null', () => {
  assert.equal(statusProgressao([ws(60, 7)], null, faixa), null);
  assert.equal(statusProgressao([], [ws(60, 7)], faixa), null);
});

test('desvio da faixa: reps abaixo do mínimo e acima do máximo (Muscle Round fica fora)', () => {
  assert.deepEqual(desvioFaixa([ws(60, 4), top(60, 10), mr(10, 2)], 6, 8), { abaixo: 2, acima: 2 });
  assert.deepEqual(desvioFaixa([ws(60, 7)], 6, 8), { abaixo: 0, acima: 0 });
});

test('comparar exercício: variação % contra o anterior e contra o Micro 1', () => {
  const c = compararExercicio([ws(60, 8), top(65, 8)], [ws(60, 7), top(60, 7)], [ws(50, 8), top(50, 8)], faixa);
  assert.equal(c.tonelagem, 1000);
  assert.equal(c.vs_anterior.tonelagem, 19); // 1000 vs 840
  assert.equal(c.vs_anterior.carga, 8.3); // 65 vs 60
  assert.equal(c.vs_micro1.tonelagem, 25); // 1000 vs 800
  assert.equal(c.status, 'progrediu');
  assert.equal(compararExercicio([ws(60, 8)], null, null, faixa).vs_anterior, null);
});

const item = { reps_min: 6, reps_max: 8, incremento_kg: 5, metodo: 'normal' };

test('sugestão: TOP no máximo da faixa com o RIR alvo → +1 incremento', () => {
  const s = sugestaoCarga([ws(60, 8), top(60, 8, 0)], item);
  assert.equal(s.acao, 'subir');
  assert.equal(s.kg, 65);
  // bateu o máximo mas com RIR acima do alvo: ainda não sobe
  assert.equal(sugestaoCarga([ws(60, 8), top(60, 8, 2)], item).acao, 'mais_rep');
});

test('sugestão: dentro da faixa → mesma carga e +1 rep', () => {
  const s = sugestaoCarga([ws(60, 7), top(60, 7)], item);
  assert.deepEqual([s.acao, s.kg, s.reps], ['mais_rep', 60, 8]);
});

test('sugestão: abaixo do mínimo → manter ou baixar ~5% (arredondado ao incremento)', () => {
  const s = sugestaoCarga([ws(100, 5), top(100, 5)], item);
  assert.deepEqual([s.acao, s.kg], ['baixar', 95]);
  // 5% de 60 = 3 → arredonda para 60 de novo; baixa 1 incremento (55 = −8,3%)
  assert.deepEqual([sugestaoCarga([top(60, 4)], item).acao, sugestaoCarga([top(60, 4)], item).kg], ['baixar', 55]);
  // 25 → 20 seria −20% (mais que 10%): só mantém
  assert.deepEqual([sugestaoCarga([top(25, 3)], item).acao, sugestaoCarga([top(25, 3)], item).kg], ['manter', 25]);
});

test('sugestão: Muscle Round fechou os 4×4 → sobe; senão mantém; sem histórico → null', () => {
  const m = { metodo: 'muscle_round', mr_reps: 4, incremento_kg: 2 };
  assert.equal(sugestaoCarga([mr(10, 4), mr(10, 4), mr(10, 4), mr(10, 4)], m).kg, 12);
  assert.equal(sugestaoCarga([mr(10, 4), mr(10, 3), mr(10, 3), mr(10, 2)], m).acao, 'manter');
  assert.equal(sugestaoCarga([], item), null);
  assert.equal(sugestaoCarga(undefined, item), null);
});

const P = 'progrediu';
const M = 'manteve';
const R = 'regrediu';

test('fadiga baixa: ≥ 70% dos exercícios progrediram', () => {
  const a = analisarMicro({ statuses: [P, P, P, P, P, P, P, M, M, M], variacaoTonelagem: 3 });
  assert.equal(a.nivel, 'baixa');
  assert.equal(a.mensagem, 'Ótimo microciclo, siga a progressão.');
  assert.equal(a.progrediram, 7);
});

test('fadiga moderada: a maioria manteve, ou a tonelagem caiu até 5%', () => {
  assert.equal(analisarMicro({ statuses: [M, M, M, P, P] }).nivel, 'moderada');
  assert.equal(analisarMicro({ statuses: [P, P, P, M, R], variacaoTonelagem: -4 }).nivel, 'moderada');
});

test('fadiga alta: ≥ 2 regrediram, ou tonelagem caiu > 5% em 2 micros seguidos', () => {
  assert.equal(analisarMicro({ statuses: [P, P, P, P, P, P, P, P, R, R] }).nivel, 'alta');
  assert.equal(analisarMicro({ statuses: [P, P, P, P], variacaoTonelagem: -6, variacaoAnterior: -5.5 }).nivel, 'alta');
  // só um micro com queda > 5%: não é alta
  assert.equal(analisarMicro({ statuses: [P, P, P, M], variacaoTonelagem: -6, variacaoAnterior: 2 }).nivel, 'baixa');
  assert.equal(LIMITES.regrediramAlta, 2);
});

test('fadiga: micro sem registro = NÃO EXECUTADO; primeiro micro = base', () => {
  assert.equal(analisarMicro({ executado: false }).mensagem, 'NÃO EXECUTADO');
  assert.equal(analisarMicro({ statuses: [null, null] }).nivel, 'base');
});

test('deload: fadiga alta em 2 micros seguidos ou check-in com média ≤ 2', () => {
  assert.equal(sugerirDeload(['base', 'alta', 'alta']).sugerir, true);
  assert.equal(sugerirDeload(['base', 'alta', 'nao_executado', 'alta']).sugerir, true); // pula o micro não feito
  assert.equal(sugerirDeload(['base', 'alta', 'moderada']).sugerir, false);
  assert.equal(sugerirDeload(['base', 'baixa'], 2).sugerir, true);
  assert.equal(sugerirDeload(['base', 'baixa'], 2.2).sugerir, false);
  assert.deepEqual([3, 2, 1, 0].map(seriesNoDeload), [2, 1, 1, 0]);
});

test('check-in: semana ISO e média das notas', () => {
  assert.equal(semanaIso('2026-10-20'), '2026-W43');
  assert.equal(semanaIso('2026-10-25'), '2026-W43'); // domingo ainda é a mesma semana
  assert.equal(semanaIso('2027-01-01'), '2026-W53');
  assert.equal(semanaIso('2026-01-01'), '2026-W01');
  assert.equal(mediaCheckin({ sono: 4, energia: 3, dor: 5, estresse: 2, dieta: 4 }), 3.6);
  assert.equal(mediaCheckin(null), null);
});
