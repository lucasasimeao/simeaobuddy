// Análise de fadiga por microciclo: o quadro "ANÁLISE DO MICROCICLO" da planilha (docs/04 §4, docs/03 itens 3 e 8).
// Este arquivo também roda no navegador (servido em /js/treino/), então não usa nada do Node.

// Limites (docs/03 item 8: os propostos no docs/04). Mude aqui se quiser outros.
export const LIMITES = {
  pctProgrediuBaixa: 70, // ≥ 70% dos exercícios progrediram → fadiga baixa
  regrediramAlta: 2, // ≥ 2 exercícios regrediram → fadiga alta
  quedaTonelagem: 5, // tonelagem caiu mais de 5%… em 2 micros seguidos → fadiga alta
  checkinDeload: 2, // média do check-in semanal ≤ 2 → sugerir deload (docs/02)
};

export const FADIGA = {
  baixa: { cor: 'ok', texto: 'Baixa', mensagem: 'Ótimo microciclo, siga a progressão.' },
  moderada: { cor: 'atencao', texto: 'Moderada', mensagem: 'Atenção ao sono, à dieta e ao descanso.' },
  alta: { cor: 'erro', texto: 'Alta', mensagem: 'Fadiga acumulada: considere um deload ou revise a recuperação.' },
  nao_executado: { cor: 'neutra', texto: '—', mensagem: 'NÃO EXECUTADO' },
  base: { cor: 'neutra', texto: '—', mensagem: 'Primeiro microciclo: é a base de comparação.' },
};

// statuses: status de cada exercício ('progrediu' | 'manteve' | 'regrediu' | null)
// variacaoTonelagem: % contra o micro anterior · variacaoAnterior: a % do micro anterior contra o dele
// Devolve { nivel, ...FADIGA[nivel], progrediram, mantiveram, regrediram, comparados }
export function analisarMicro({ executado = true, statuses = [], variacaoTonelagem = null, variacaoAnterior = null }) {
  const contagem = { progrediram: 0, mantiveram: 0, regrediram: 0 };
  for (const s of statuses) {
    if (s === 'progrediu') contagem.progrediram++;
    else if (s === 'manteve') contagem.mantiveram++;
    else if (s === 'regrediu') contagem.regrediram++;
  }
  const comparados = contagem.progrediram + contagem.mantiveram + contagem.regrediram;
  const nivel = (() => {
    if (!executado) return 'nao_executado';
    if (!comparados) return 'base';
    const caiu = (v) => v != null && v < -LIMITES.quedaTonelagem;
    if (contagem.regrediram >= LIMITES.regrediramAlta || (caiu(variacaoTonelagem) && caiu(variacaoAnterior))) return 'alta';
    if ((contagem.progrediram / comparados) * 100 >= LIMITES.pctProgrediuBaixa) return 'baixa';
    return 'moderada';
  })();
  return { nivel, ...FADIGA[nivel], ...contagem, comparados };
}

// Sugerir deload? Fadiga alta nos 2 últimos micros executados, ou check-in com média ≤ 2 (docs/02, docs/03 item 3).
// niveis: nível de cada micro em ordem · mediaCheckin: média do último check-in (ou null)
export function sugerirDeload(niveis, mediaCheckin = null) {
  const executados = niveis.filter((n) => n !== 'nao_executado' && n != null);
  const ultimos = executados.slice(-2);
  if (ultimos.length === 2 && ultimos.every((n) => n === 'alta')) {
    return { sugerir: true, motivo: 'Fadiga alta em 2 microciclos seguidos.' };
  }
  if (mediaCheckin != null && mediaCheckin <= LIMITES.checkinDeload) {
    return { sugerir: true, motivo: 'O check-in da semana veio baixo (sono, energia, dor, estresse ou dieta).' };
  }
  return { sugerir: false, motivo: null };
}

// Como fazer o deload (docs/03 item 3): semana opcional com 50% das séries, RIR 3 a 4, a mesma carga
export const DELOAD = { pctSeries: 50, rir: '3–4', texto: 'Semana de deload (opcional): metade das séries válidas, RIR 3 a 4 e a mesma carga. Depois, siga o bloco.' };

export function seriesNoDeload(n) {
  return n > 0 ? Math.max(1, Math.round((n * DELOAD.pctSeries) / 100)) : 0;
}
