// Regras puras da Etapa 6: média móvel de 7 dias e meta de ritmo do peso por objetivo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaMovel7, avaliarPeso } from '../src/treino/corpo.js';

// n dias terminando em "fim", com o peso dado por f(i) (i = 0 é o primeiro dia)
function dias(fim, n, f) {
  const [a, m, d] = fim.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => ({
    data: new Date(Date.UTC(a, m - 1, d - (n - 1 - i))).toISOString().slice(0, 10),
    peso: Math.round(f(i) * 100) / 100,
  }));
}

test('média móvel de 7 dias: o dia e os 6 anteriores (dia sem registro não entra)', () => {
  const s = mediaMovel7([
    { data: '2026-10-01', peso: 80 }, { data: '2026-10-02', peso: 82 }, { data: '2026-10-04', peso: 81 },
    { data: '2026-10-08', peso: 79 }, { data: '2026-10-09', peso: 78 },
  ]);
  assert.deepEqual(s.map((p) => p.media), [80, 81, 81, 80.67, 79.33]);
  // fora de ordem: ordena por data
  assert.deepEqual(mediaMovel7([{ data: '2026-10-02', peso: 2 }, { data: '2026-10-01', peso: 1 }]).map((p) => p.data), ['2026-10-01', '2026-10-02']);
});

test('emagrecimento no ritmo (−0,7%/semana) → sem alerta', () => {
  const pesos = dias('2026-10-20', 30, (i) => 80 * (1 - 0.007 / 7) ** i);
  const a = avaliarPeso(pesos, 'emagrecimento', '2026-10-20');
  assert.equal(a.alerta, false);
  assert.match(a.mensagem, /No ritmo certo/);
  assert.ok(a.ritmo.semana < -0.5 && a.ritmo.semana > -1);
});

test('emagrecimento parado por 2 semanas → alerta "caindo devagar"', () => {
  const pesos = dias('2026-10-20', 30, () => 80);
  const a = avaliarPeso(pesos, 'emagrecimento', '2026-10-20');
  assert.equal(a.alerta, true);
  assert.match(a.mensagem, /caindo devagar/);
});

test('emagrecimento rápido demais (−2%/semana) → alerta de massa magra', () => {
  const a = avaliarPeso(dias('2026-10-20', 30, (i) => 80 * (1 - 0.02 / 7) ** i), 'emagrecimento', '2026-10-20');
  assert.equal(a.alerta, true);
  assert.match(a.mensagem, /rápido demais/);
});

test('fora da meta só na última semana → mostra a mensagem, mas ainda sem alerta', () => {
  // 3 semanas caindo 0,7%/semana e a última parada
  const pesos = dias('2026-10-20', 29, (i) => (i < 22 ? 80 * (1 - 0.007 / 7) ** i : 80 * (1 - 0.007 / 7) ** 21));
  const a = avaliarPeso(pesos, 'emagrecimento', '2026-10-20');
  assert.match(a.mensagem, /devagar/);
  assert.equal(a.alerta, false);
});

test('hipertrofia: +0,35%/mês está dentro; parado por 2 semanas dá alerta "subindo devagar"', () => {
  const certo = avaliarPeso(dias('2026-10-20', 30, (i) => 75 * (1 + 0.0035 / 30) ** i), 'hipertrofia', '2026-10-20');
  assert.equal(certo.alerta, false);
  assert.ok(certo.ritmo.mes > 0.25 && certo.ritmo.mes < 0.5);
  const parado = avaliarPeso(dias('2026-10-20', 30, () => 75), 'hipertrofia', '2026-10-20');
  assert.equal(parado.alerta, true);
  assert.match(parado.mensagem, /subindo devagar/);
});

test('poucos dias, sem objetivo ou sem peso: sem alerta', () => {
  assert.match(avaliarPeso(dias('2026-10-20', 5, () => 80), 'emagrecimento', '2026-10-20').mensagem, /pelo menos 8 dias/);
  assert.equal(avaliarPeso(dias('2026-10-20', 30, () => 80), null, '2026-10-20').alerta, false);
  assert.equal(avaliarPeso([], 'hipertrofia', '2026-10-20').ultimo, null);
  // pesagem antiga (mais de 3 dias antes de hoje) não vale como "agora"
  assert.equal(avaliarPeso(dias('2026-10-10', 30, () => 80), 'emagrecimento', '2026-10-20').alerta, false);
});
