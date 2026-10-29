// Volume em escada (docs/03 itens 2 e 4; docs/05 regra 4).
// "2 WS" nas fichas = 1 WS (RIR 1) + 1 TOP (RIR 0). O TOP é sempre a última série válida.
import { GRUPOS } from './grupos.js';

export const RIR_WS = 1;
export const RIR_TOP = 0;
export const PCT_BO = 20; // back-off = −20% da carga do top set (docs/03 item 6)

// Quantas séries válidas por semana do bloco de 3 (S1, S2, S3), e se tem BO na S3
const PADROES = {
  multi_estavel_superior: { validas: [2, 3, 3], bo: [0, 0, 0] },
  superior: { validas: [2, 2, 2], bo: [0, 0, 1] },
  inferior: { validas: [2, 2, 2], bo: [0, 0, 0] },
};

// Semana de uma escada: "n séries válidas" → WS + TOP
export function semana({ validas = 0, bo = 0, mr = 0, rirWs = RIR_WS, rirTop = RIR_TOP, pctBo = PCT_BO }) {
  return {
    n_ws: Math.max(validas - 1, 0),
    rir_ws: rirWs,
    n_top: validas > 0 ? 1 : 0,
    rir_top: rirTop,
    n_bo: bo,
    pct_bo: pctBo,
    n_mr: mr,
  };
}

// Qual padrão vale para o exercício
export function tipoDeEscada(exercicio) {
  const regiao = GRUPOS[exercicio.grupo_primario]?.regiao;
  if (regiao !== 'superior') return 'inferior'; // inferiores e abdômen: volume fixo
  if (exercicio.tipo === 'multi' && exercicio.estavel) return 'multi_estavel_superior';
  return 'superior';
}

// Escada padrão de um item para n microciclos. A partir da S4 o bloco de 3 se repete.
export function escadaPadrao(exercicio, nMicrociclos = 3, metodo = 'normal') {
  const p = PADROES[tipoDeEscada(exercicio)];
  return Array.from({ length: nMicrociclos }, (_, i) => {
    const s = i % 3;
    if (metodo === 'muscle_round') return { microciclo: i + 1, ...semana({ mr: 1 }) };
    return { microciclo: i + 1, ...semana({ validas: p.validas[s], bo: p.bo[s] }) };
  });
}

// Séries que contam volume na semana (WS + TOP + BO + muscle rounds)
export function seriesValidas(s) {
  return (s?.n_ws || 0) + (s?.n_top || 0) + (s?.n_bo || 0) + (s?.n_mr || 0);
}

// Texto curto, igual às fichas: "2 WS", "3 WS", "2 WS + 1 BO", "1 TOP", "1 MR"
export function descreverSemana(s) {
  if (!s) return '—';
  const partes = [];
  const validas = (s.n_ws || 0) + (s.n_top || 0);
  if (validas) partes.push(s.n_ws === 0 ? `${s.n_top} TOP` : `${validas} WS`);
  if (s.n_bo) partes.push(`${s.n_bo} BO`);
  if (s.n_mr) partes.push(`${s.n_mr} MR`);
  return partes.join(' + ') || '0';
}

// Lista ordenada das séries válidas da semana: [{tipo:'ws', rir}, ..., {tipo:'top'}, {tipo:'bo'}]
export function seriesDaSemana(s) {
  if (!s) return [];
  return [
    ...Array.from({ length: s.n_ws || 0 }, () => ({ tipo: 'ws', rir: s.rir_ws })),
    ...Array.from({ length: s.n_top || 0 }, () => ({ tipo: 'top', rir: s.rir_top })),
    ...Array.from({ length: s.n_bo || 0 }, () => ({ tipo: 'bo', pct: s.pct_bo })),
    ...Array.from({ length: s.n_mr || 0 }, () => ({ tipo: 'muscle_round' })),
  ];
}
