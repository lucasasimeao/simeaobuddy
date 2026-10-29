// Sobrecarga progressiva, sugestão de carga e e1RM (docs/05 regras 6, 7 e 9; docs/04 §4).
// Este arquivo também roda no navegador (servido em /js/treino/), então não usa nada do Node.
import { arredondarAoIncremento } from './feeders.js';
import { tonelagem, totalReps, cargaUtilizada, variacao, TIPOS_VALIDOS } from './tonelagem.js';
import { RIR_TOP } from './escada.js';

export const STATUS = {
  progrediu: { cor: 'ok', emoji: '🟢', texto: 'Progrediu' },
  manteve: { cor: 'atencao', emoji: '🟡', texto: 'Manteve' },
  regrediu: { cor: 'erro', emoji: '🔴', texto: 'Regrediu' },
};

// Abaixo do mínimo: manter ou baixar de 5 a 10% (docs/05 regra 7). O app sugere o meio-termo de −5%.
export const PCT_BAIXAR = 5;
export const PCT_BAIXAR_MAX = 10;

const EPS = 0.001;
const validas = (series) => series.filter((s) => TIPOS_VALIDOS.includes(s.tipo) && s.carga != null && s.reps != null);
// Para o status, o back-off fica de fora: ele entra só na S3 e baixaria a média sem a pessoa ter piorado
const principais = (series) => validas(series).filter((s) => s.tipo !== 'bo');

// e1RM = kg × (1 + (reps + RIR) / 30). Sem RIR registrado, conta como 0 (falha).
export function e1rm(kg, reps, rir = 0) {
  if (!(kg > 0) || !(reps > 0)) return null;
  return Math.round(kg * (1 + (reps + (rir ?? 0)) / 30) * 10) / 10;
}

export function melhorE1rm(series) {
  const v = validas(series).map((s) => e1rm(s.carga, s.reps, s.rir)).filter((x) => x != null);
  return v.length ? Math.max(...v) : null;
}

// Reps da série que define a carga: o TOP; sem TOP, a série mais pesada (a de mais reps, se empatar)
export function repsNaCarga(series) {
  const v = principais(series);
  const top = v.filter((s) => s.tipo === 'top');
  const base = top.length ? top : v;
  if (!base.length) return null;
  const carga = Math.max(...base.map((s) => s.carga));
  return Math.max(...base.filter((s) => s.carga === carga).map((s) => s.reps));
}

// Tonelagem média por série (sem BO): compara semanas com nº de séries diferente na escada (2 → 3 → 3)
export function tonelagemPorSerie(series) {
  const v = principais(series);
  return v.length ? tonelagem(v) / v.length : null;
}

// Quantas reps ficaram abaixo do mínimo ou acima do máximo da faixa (soma de todas as séries)
export function desvioFaixa(series, repsMin, repsMax) {
  const d = { abaixo: 0, acima: 0 };
  for (const s of validas(series)) {
    if (s.tipo === 'muscle_round') continue; // reps fixas por bloco
    if (repsMin != null && s.reps < repsMin) d.abaixo += repsMin - s.reps;
    if (repsMax != null && s.reps > repsMax) d.acima += s.reps - repsMax;
  }
  return d;
}

// O TOP (ou a série que define a carga) ficou abaixo do mínimo da faixa?
function topAbaixoDoMinimo(series, repsMin) {
  if (repsMin == null || principais(series).every((s) => s.tipo === 'muscle_round')) return false;
  const r = repsNaCarga(series);
  return r != null && r < repsMin;
}

// Status de um exercício contra a vez anterior (docs/04 §4 "Regra de sobrecarga progressiva").
// faixa: { reps_min, reps_max }. Devolve 'progrediu' | 'manteve' | 'regrediu' | null (sem base).
// DECIDIR: a regra não fala de "mesma carga com menos reps"; aqui isso conta como regrediu.
export function statusProgressao(atual, anterior, faixa = {}) {
  if (!principais(atual).length || !anterior || !principais(anterior).length) return null;
  if (topAbaixoDoMinimo(atual, faixa.reps_min)) return 'regrediu';
  const c = cargaUtilizada(atual);
  const c0 = cargaUtilizada(anterior);
  const r = repsNaCarga(atual);
  const r0 = repsNaCarga(anterior);
  const t = tonelagemPorSerie(atual);
  const t0 = tonelagemPorSerie(anterior);
  if (c > c0 + EPS) return 'progrediu';
  if (Math.abs(c - c0) <= EPS) {
    if (r > r0 || t > t0 + EPS) return 'progrediu';
    if (r < r0 || t < t0 - EPS) return 'regrediu';
    return 'manteve';
  }
  // carga caiu
  return t < t0 - EPS ? 'regrediu' : 'manteve';
}

// Números de um exercício num treino
export function metricas(series) {
  const v = validas(series);
  return { tonelagem: tonelagem(v), reps: totalReps(v), carga: cargaUtilizada(v), series: v.length };
}

// Compara Treino X – Micro N com o micro anterior e com o Micro 1 (docs/05 regra 6)
export function compararExercicio(atual, anterior, primeiro, faixa = {}) {
  const m = metricas(atual);
  const a = anterior ? metricas(anterior) : null;
  const p = primeiro ? metricas(primeiro) : null;
  const vs = (base) => (base && m.series ? {
    tonelagem: variacao(m.tonelagem, base.tonelagem), carga: variacao(m.carga, base.carga), reps: variacao(m.reps, base.reps),
  } : null);
  return {
    ...m,
    vs_anterior: vs(a),
    vs_micro1: vs(p),
    desvio: desvioFaixa(atual, faixa.reps_min, faixa.reps_max),
    status: statusProgressao(atual, anterior, faixa),
  };
}

// Sugestão de carga para hoje, pela última vez que fez o exercício (dupla progressão na faixa, docs/05 regra 7).
// item: { reps_min, reps_max, metodo, mr_reps, incremento_kg, rir_top }
// Devolve { acao: 'subir' | 'mais_rep' | 'baixar' | 'manter', kg, reps, texto } ou null (sem histórico).
export function sugestaoCarga(seriesAnteriores, item) {
  const v = principais(seriesAnteriores || []);
  if (!v.length) return null;
  const inc = item.incremento_kg || 1;
  const kg = cargaUtilizada(v);
  const fmt = (n) => String(n).replace('.', ',');

  if (item.metodo === 'muscle_round') {
    const alvo = item.mr_reps || 4;
    if (v.every((s) => s.reps >= alvo)) {
      const novo = arredondarAoIncremento(kg + inc, inc);
      return { acao: 'subir', kg: novo, reps: alvo, texto: `Fechou todos os blocos: suba para ${fmt(novo)} kg.` };
    }
    return { acao: 'manter', kg, reps: alvo, texto: `Mantenha ${fmt(kg)} kg e feche os ${alvo} reps em todos os blocos.` };
  }

  const r = repsNaCarga(v);
  const top = v.filter((s) => s.tipo === 'top').at(-1) || v.find((s) => s.carga === kg);
  const rirAlvo = item.rir_top ?? RIR_TOP;
  const rirOk = top?.rir == null || top.rir <= rirAlvo;
  if (item.reps_max != null && r >= item.reps_max && rirOk) {
    const novo = arredondarAoIncremento(kg + inc, inc);
    return { acao: 'subir', kg: novo, reps: item.reps_min ?? null, texto: `Bateu ${r} reps no topo da faixa: suba para ${fmt(novo)} kg.` };
  }
  if (item.reps_min != null && r < item.reps_min) {
    const menor = arredondarAoIncremento(kg * (1 - PCT_BAIXAR / 100), inc);
    const novo = menor < kg ? menor : Math.max(kg - inc, 0);
    // Baixar mais de 10% (incremento grande para a carga) não vale: só mantém
    if (novo < kg * (1 - PCT_BAIXAR_MAX / 100) - EPS) {
      return { acao: 'manter', kg, reps: item.reps_min, texto: `Ficou abaixo da faixa (${r} reps): mantenha ${fmt(kg)} kg e olhe a fadiga.` };
    }
    return { acao: 'baixar', kg: novo, reps: item.reps_min, texto: `Ficou abaixo da faixa (${r} reps): mantenha ${fmt(kg)} kg ou baixe para ${fmt(novo)} kg, e olhe a fadiga.` };
  }
  return { acao: 'mais_rep', kg, reps: r + 1, texto: `Mesma carga (${fmt(kg)} kg) e busque ${r + 1} reps.` };
}
