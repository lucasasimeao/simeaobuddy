// Warm-up automático e contador de séries por músculo por semana.
import { seriesValidas } from './escada.js';

export const VOLUME_MIN = 4;  // abaixo disso: pouco volume (docs/01)
export const VOLUME_MAX = 10; // acima disso: muito volume para low volume

// Warm-up só no 1º exercício de cada grupo muscular do treino (docs/04 §1).
// itens: [{ warmup: 'auto'|'sim'|'nao', exercicio: { grupo_primario } }] na ordem do treino
export function marcarWarmups(itens) {
  const vistos = new Set();
  return itens.map((item) => {
    const grupo = item.exercicio?.grupo_primario;
    const primeiro = grupo && !vistos.has(grupo);
    if (grupo) vistos.add(grupo);
    const tem = item.warmup === 'sim' || (item.warmup !== 'nao' && primeiro);
    return { ...item, tem_warmup: Boolean(tem) };
  });
}

// { grupo: séries } numa semana. Série direta = 1; indireta = fração do exercício (padrão ½).
// itens: [{ exercicio: { grupo_primario, grupos_secundarios }, semanas: [{microciclo, n_ws...}] }]
export function seriesPorMusculo(itens, microciclo) {
  const total = {};
  for (const item of itens) {
    const s = item.semanas?.find((x) => x.microciclo === microciclo);
    const n = seriesValidas(s);
    if (!n || !item.exercicio) continue;
    const { grupo_primario: g, grupos_secundarios: sec = [] } = item.exercicio;
    total[g] = (total[g] || 0) + n;
    for (const { grupo, fracao } of sec) total[grupo] = (total[grupo] || 0) + n * fracao;
  }
  return total;
}

export function avisoVolume(series) {
  if (series < VOLUME_MIN) return 'abaixo';
  if (series > VOLUME_MAX) return 'acima';
  return 'ok';
}

// Tabela para a tela: [{ grupo, semanas: [{microciclo, series, aviso}] }], só grupos treinados
export function tabelaVolume(itens, nMicrociclos) {
  const porSemana = Array.from({ length: nMicrociclos }, (_, i) => seriesPorMusculo(itens, i + 1));
  const grupos = [...new Set(porSemana.flatMap((s) => Object.keys(s)))];
  return grupos.map((grupo) => ({
    grupo,
    semanas: porSemana.map((s, i) => {
      const series = Math.round((s[grupo] || 0) * 10) / 10;
      return { microciclo: i + 1, series, aviso: avisoVolume(series) };
    }),
  }));
}
