// Regras puras: escada, feeders, warm-up e contador de volume.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escadaPadrao, tipoDeEscada, semana, seriesValidas, descreverSemana, seriesDaSemana } from '../src/treino/escada.js';
import { FEEDERS_PADRAO, feedersDoItem, calcularFeeders, arredondarAoIncremento } from '../src/treino/feeders.js';
import { marcarWarmups, seriesPorMusculo, avisoVolume, tabelaVolume } from '../src/treino/volume.js';

const supinoMaq = { grupo_primario: 'peito', tipo: 'multi', estavel: true };
const supinoBarra = { grupo_primario: 'peito', tipo: 'multi', estavel: false };
const elevLateral = { grupo_primario: 'ombro_lateral', tipo: 'isolado', estavel: true };
const hack = { grupo_primario: 'quadriceps', tipo: 'multi', estavel: true };
const abdomen = { grupo_primario: 'abdomen', tipo: 'isolado', estavel: true };

const resumo = (escada) => escada.map(descreverSemana);

test('"2 WS" = 1 WS com RIR 1 + 1 TOP com RIR 0', () => {
  assert.deepEqual(semana({ validas: 2 }), { n_ws: 1, rir_ws: 1, n_top: 1, rir_top: 0, n_bo: 0, pct_bo: 20, n_mr: 0 });
  assert.deepEqual(seriesDaSemana(semana({ validas: 2, bo: 1 })).map((s) => s.tipo), ['ws', 'top', 'bo']);
});

test('multiarticular estável de superiores: 2 → 3 → 3 WS', () => {
  assert.equal(tipoDeEscada(supinoMaq), 'multi_estavel_superior');
  assert.deepEqual(resumo(escadaPadrao(supinoMaq)), ['2 WS', '3 WS', '3 WS']);
});

test('outros de superiores (isolados e multi livres): 2 → 2 → 2 WS + 1 BO', () => {
  assert.deepEqual(resumo(escadaPadrao(elevLateral)), ['2 WS', '2 WS', '2 WS + 1 BO']);
  assert.deepEqual(resumo(escadaPadrao(supinoBarra)), ['2 WS', '2 WS', '2 WS + 1 BO']);
});

test('inferiores e abdômen: volume fixo de 2 WS', () => {
  assert.deepEqual(resumo(escadaPadrao(hack)), ['2 WS', '2 WS', '2 WS']);
  assert.deepEqual(resumo(escadaPadrao(abdomen)), ['2 WS', '2 WS', '2 WS']);
});

test('com mais de 3 microciclos o bloco de 3 se repete', () => {
  assert.deepEqual(resumo(escadaPadrao(supinoMaq, 6)), ['2 WS', '3 WS', '3 WS', '2 WS', '3 WS', '3 WS']);
});

test('Muscle Round: 1 MR fixo por semana, conta como 1 série', () => {
  const e = escadaPadrao(elevLateral, 3, 'muscle_round');
  assert.deepEqual(resumo(e), ['1 MR', '1 MR', '1 MR']);
  assert.equal(seriesValidas(e[0]), 1);
});

test('descrição: só TOP vira "1 TOP"', () => {
  assert.equal(descreverSemana(semana({ validas: 1 })), '1 TOP');
  assert.equal(descreverSemana(null), '—');
});

test('feeders padrão por papel (50/75/90 · 75/90 · 80)', () => {
  assert.deepEqual(FEEDERS_PADRAO.principal.map((f) => f.pct), [50, 75, 90]);
  assert.deepEqual(FEEDERS_PADRAO.secundario.map((f) => f.pct), [75, 90]);
  assert.deepEqual(FEEDERS_PADRAO.isolado.map((f) => f.pct), [80]);
  const proprias = [{ reps: '2', pct: 90, descanso: 60 }];
  assert.equal(feedersDoItem({ papel: 'isolado', feeders: proprias }), proprias);
  assert.equal(feedersDoItem({ papel: 'isolado', feeders: null }), FEEDERS_PADRAO.isolado);
});

test('carga das feeders: 60 kg de trabalho → 30 / 45 / 55 kg (incremento 5)', () => {
  assert.deepEqual(calcularFeeders(FEEDERS_PADRAO.principal, 60, 5).map((f) => f.kg), [30, 45, 55]);
  assert.deepEqual(calcularFeeders(FEEDERS_PADRAO.principal, 0, 5).map((f) => f.kg), [null, null, null]);
});

test('arredondar ao incremento do aparelho', () => {
  assert.equal(arredondarAoIncremento(54, 5), 55);
  assert.equal(arredondarAoIncremento(41.3, 2.5), 42.5);
  assert.equal(arredondarAoIncremento(17, 2), 18);
  assert.equal(arredondarAoIncremento(33.33, 0), 33.3);
});

test('warm-up só no 1º exercício de cada grupo muscular; "sim"/"nao" mandam', () => {
  const itens = [
    { warmup: 'auto', exercicio: { grupo_primario: 'peito' } },
    { warmup: 'auto', exercicio: { grupo_primario: 'peito' } },
    { warmup: 'auto', exercicio: { grupo_primario: 'ombro_lateral' } },
    { warmup: 'nao', exercicio: { grupo_primario: 'triceps' } },
    { warmup: 'sim', exercicio: { grupo_primario: 'peito' } },
  ];
  assert.deepEqual(marcarWarmups(itens).map((i) => i.tem_warmup), [true, false, true, false, true]);
});

test('contador por músculo: direta = 1, indireta = fração', () => {
  const itens = [
    { exercicio: { grupo_primario: 'peito', grupos_secundarios: [{ grupo: 'triceps', fracao: 0.5 }] }, semanas: [{ microciclo: 1, ...semana({ validas: 2 }) }] },
    { exercicio: { grupo_primario: 'triceps', grupos_secundarios: [] }, semanas: [{ microciclo: 1, ...semana({ validas: 2, bo: 1 }) }] },
  ];
  assert.deepEqual(seriesPorMusculo(itens, 1), { peito: 2, triceps: 4 });
  assert.deepEqual(seriesPorMusculo(itens, 2), {});
  const tabela = tabelaVolume(itens, 1);
  assert.deepEqual(tabela.find((t) => t.grupo === 'peito').semanas[0], { microciclo: 1, series: 2, aviso: 'abaixo' });
});

test('aviso de volume: abaixo de 4, acima de 10', () => {
  assert.equal(avisoVolume(3.5), 'abaixo');
  assert.equal(avisoVolume(4), 'ok');
  assert.equal(avisoVolume(10), 'ok');
  assert.equal(avisoVolume(10.5), 'acima');
});
