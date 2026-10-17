// Feeders (séries preparatórias) pelo papel do exercício no treino (docs/04 §1, docs/05 regra 2).
// Carga = % da carga de trabalho prevista, arredondada ao incremento do aparelho.

export const FEEDERS_PADRAO = {
  principal: [
    { reps: '10–12', pct: 50, descanso: 30 },
    { reps: '5', pct: 75, descanso: 45 },
    { reps: '2', pct: 90, descanso: 60 },
  ],
  secundario: [
    { reps: '5', pct: 75, descanso: 45 },
    { reps: '2', pct: 90, descanso: 60 },
  ],
  isolado: [{ reps: '6', pct: 80, descanso: 45 }],
};

export const RIR_FEEDER = 5; // RIR ≥ 5: não conta volume

// As feeders do item: as próprias (se o admin definiu) ou as do papel
export function feedersDoItem(item) {
  if (Array.isArray(item.feeders)) return item.feeders;
  return FEEDERS_PADRAO[item.papel] || [];
}

// Arredonda para o múltiplo mais próximo do incremento (60 × 90% = 54 → 55 com incremento 5)
export function arredondarAoIncremento(kg, incremento) {
  if (!(incremento > 0)) return Math.round(kg * 10) / 10;
  const n = Math.round(kg / incremento) * incremento;
  return Math.round(n * 100) / 100;
}

// [{reps, pct, descanso, kg}] para uma carga de trabalho (sem carga → kg null)
export function calcularFeeders(feeders, cargaTrabalho, incremento) {
  return feeders.map((f) => ({
    ...f,
    kg: cargaTrabalho > 0 ? arredondarAoIncremento((cargaTrabalho * f.pct) / 100, incremento) : null,
  }));
}
