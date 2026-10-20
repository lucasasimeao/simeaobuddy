// Check-in semanal (docs/02 item 5): sono, energia, dor, estresse e dieta de 1 a 5. Alimenta o alerta de deload.
// Em todas as notas, 5 é o melhor (dor 5 = sem dor; estresse 5 = tranquilo).
// Este arquivo também roda no navegador (servido em /js/treino/), então não usa nada do Node.

export const PERGUNTAS = [
  { campo: 'sono', texto: 'Sono', baixo: 'péssimo', alto: 'ótimo' },
  { campo: 'energia', texto: 'Energia', baixo: 'sem energia', alto: 'muita energia' },
  { campo: 'dor', texto: 'Dor e articulações', baixo: 'muita dor', alto: 'sem dor' },
  { campo: 'estresse', texto: 'Estresse', baixo: 'muito estresse', alto: 'tranquilo' },
  { campo: 'dieta', texto: 'Dieta', baixo: 'fugi da dieta', alto: 'segui certinho' },
];

// Semana ISO de uma data AAAA-MM-DD: "2026-W43"
export function semanaIso(data) {
  const [a, m, d] = data.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  const diaSemana = dt.getUTCDay() || 7; // segunda = 1 … domingo = 7
  dt.setUTCDate(dt.getUTCDate() + 4 - diaSemana); // a quinta da mesma semana define o ano
  const ano = dt.getUTCFullYear();
  const semana = Math.ceil(((dt - Date.UTC(ano, 0, 1)) / 86400000 + 1) / 7);
  return `${ano}-W${String(semana).padStart(2, '0')}`;
}

export function mediaCheckin(c) {
  if (!c) return null;
  const notas = PERGUNTAS.map((p) => c[p.campo]).filter((n) => n != null);
  return notas.length ? Math.round((notas.reduce((t, n) => t + n, 0) / notas.length) * 10) / 10 : null;
}
