// Tonelagem, total de reps, carga utilizada e back-off (docs/05 regra 5; docs/03 itens 6 e 7).
// Este arquivo também roda no navegador (servido em /js/treino/), então não usa nada do Node.
import { arredondarAoIncremento } from './feeders.js';

// Séries que contam volume. DECIDIR: o docs/05 cita ws/top/bo; incluí o muscle round
// porque ele conta como série no contador por músculo (docs/03 item 5).
export const TIPOS_VALIDOS = ['ws', 'top', 'bo', 'muscle_round'];

const validas = (series) => series.filter((s) => TIPOS_VALIDOS.includes(s.tipo) && s.carga != null && s.reps != null);

// Σ reps × kg
export function tonelagem(series) {
  return Math.round(validas(series).reduce((t, s) => t + s.reps * s.carga, 0) * 100) / 100;
}

export function totalReps(series) {
  return validas(series).reduce((t, s) => t + s.reps, 0);
}

// Carga utilizada = a carga do top set (docs/03 item 7). Sem top: a maior carga das séries válidas.
export function cargaUtilizada(series) {
  const v = validas(series);
  const top = v.filter((s) => s.tipo === 'top');
  const base = top.length ? top : v.filter((s) => s.tipo !== 'bo');
  if (!base.length) return null;
  return Math.max(...base.map((s) => s.carga));
}

// Back-off: −pct% da carga do top set, arredondado ao incremento do aparelho
export function cargaBackoff(cargaTop, pct, incremento) {
  if (!(cargaTop > 0)) return null;
  return arredondarAoIncremento(cargaTop * (1 - pct / 100), incremento);
}

// Variação % (null quando não há base de comparação)
export function variacao(atual, anterior) {
  if (anterior == null || anterior === 0 || atual == null) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}
