// Progressão de um programa: cada treino × microciclo comparado com o micro anterior e com o Micro 1,
// a análise de fadiga (por treino e por microciclo) e a sugestão de deload. As contas ficam em src/treino/.
import { carregarPrograma } from './programas.js';
import { compararExercicio, tonelagemPorSerie } from '../treino/progressao.js';
import { tonelagem, variacao } from '../treino/tonelagem.js';
import { analisarMicro, sugerirDeload, DELOAD } from '../treino/fadiga.js';
import { mediaCheckin } from '../treino/checkin.js';

// Σ tonelagem por série dos itens feitos nos dois treinos: não sobe nem cai só porque a escada mudou o nº de séries
function variacaoComparavel(pares) {
  const ok = pares.filter(([a, b]) => a.length && b?.length);
  if (!ok.length) return null;
  return variacao(ok.reduce((t, [a]) => t + tonelagemPorSerie(a), 0), ok.reduce((t, [, b]) => t + tonelagemPorSerie(b), 0));
}

export function ultimoCheckin(db, alunoId) {
  return db.prepare('SELECT * FROM checkins WHERE aluno_id = ? ORDER BY semana_iso DESC LIMIT 1').get(alunoId) || null;
}

export function progressaoDoPrograma(db, programaId) {
  const prog = carregarPrograma(db, programaId);
  if (!prog) return null;
  const treinos = db.prepare(`SELECT id, sessao_id, microciclo, data FROM treinos_realizados
    WHERE programa_id = ? AND status = 'finalizado' ORDER BY microciclo, id`).all(programaId);
  const series = treinos.length
    ? db.prepare(`SELECT treino_id, item_id, tipo, carga, reps, rir FROM series_realizadas
        WHERE treino_id IN (${treinos.map(() => '?').join(',')})`).all(...treinos.map((t) => t.id))
    : [];
  const nMicros = Math.max(prog.programa.n_microciclos, ...treinos.map((t) => t.microciclo));
  const micros = Array.from({ length: nMicros }, (_, i) => i + 1);
  // O treino que vale para (sessão, micro): o último finalizado
  const treinoDe = (sessaoId, m) => treinos.filter((t) => t.sessao_id === sessaoId && t.microciclo === m).at(-1) || null;
  const doItem = (treino, itemId) => (treino ? series.filter((s) => s.treino_id === treino.id && s.item_id === itemId) : null);

  const sessoes = prog.sessoes.map((sessao) => {
    const primeiro = micros.map((m) => treinoDe(sessao.id, m)).find(Boolean) || null;
    let varAnterior = null;
    const blocos = micros.map((m) => {
      const treino = treinoDe(sessao.id, m);
      if (!treino) return { microciclo: m, executado: false, fadiga: analisarMicro({ executado: false }), exercicios: [] };
      // Base de comparação: o último micro anterior em que este treino foi feito
      const anterior = micros.slice(0, m - 1).reverse().map((x) => treinoDe(sessao.id, x)).find(Boolean) || null;
      const pares = [];
      const exercicios = sessao.itens.map((item) => {
        const atual = doItem(treino, item.id);
        const ant = doItem(anterior, item.id);
        pares.push([atual, ant]);
        const ref = primeiro && primeiro.id !== treino.id ? doItem(primeiro, item.id) : null;
        return { item_id: item.id, nome: item.exercicio.nome, reps_min: item.reps_min, reps_max: item.reps_max,
          ...compararExercicio(atual, ant?.length ? ant : null, ref?.length ? ref : null, item) };
      });
      const ton = tonelagem(series.filter((s) => s.treino_id === treino.id));
      const tonAnt = anterior ? tonelagem(series.filter((s) => s.treino_id === anterior.id)) : null;
      const tonM1 = primeiro && primeiro.id !== treino.id ? tonelagem(series.filter((s) => s.treino_id === primeiro.id)) : null;
      const comparavel = variacaoComparavel(pares);
      const fadiga = analisarMicro({ statuses: exercicios.map((e) => e.status), variacaoTonelagem: comparavel, variacaoAnterior: varAnterior });
      varAnterior = comparavel;
      return {
        microciclo: m, executado: true, treino_id: treino.id, data: treino.data, micro_anterior: anterior?.microciclo ?? null,
        tonelagem: ton, var_anterior: variacao(ton, tonAnt), var_micro1: variacao(ton, tonM1), var_comparavel: comparavel,
        exercicios, fadiga,
      };
    });
    return { id: sessao.id, codigo: sessao.codigo, nome: sessao.nome, micros: blocos };
  });

  // Por microciclo, juntando todos os treinos: é o que decide o deload
  let varAnt = null;
  const porMicro = micros.map((m) => {
    const blocos = sessoes.map((s) => s.micros[m - 1]).filter((b) => b.executado);
    const pares = [];
    for (const s of sessoes) {
      const b = s.micros[m - 1];
      if (!b.executado || b.micro_anterior == null) continue;
      const sessao = prog.sessoes.find((x) => x.id === s.id);
      const antTreino = treinoDe(s.id, b.micro_anterior);
      for (const item of sessao.itens) pares.push([doItem(treinoDe(s.id, m), item.id), doItem(antTreino, item.id)]);
    }
    const comparavel = variacaoComparavel(pares);
    const fadiga = analisarMicro({
      executado: blocos.length > 0,
      statuses: blocos.flatMap((b) => b.exercicios.map((e) => e.status)),
      variacaoTonelagem: comparavel,
      variacaoAnterior: varAnt,
    });
    if (blocos.length) varAnt = comparavel;
    return { microciclo: m, treinos_feitos: blocos.length, tonelagem: blocos.reduce((t, b) => t + b.tonelagem, 0), var_comparavel: comparavel, fadiga };
  });

  const checkin = prog.programa.aluno_id ? ultimoCheckin(db, prog.programa.aluno_id) : null;
  const deload = sugerirDeload(porMicro.map((m) => m.fadiga.nivel), mediaCheckin(checkin));
  return {
    programa: { id: prog.programa.id, nome: prog.programa.nome, aluno_id: prog.programa.aluno_id, n_microciclos: prog.programa.n_microciclos },
    sessoes,
    micros: porMicro,
    checkin: checkin && { ...checkin, media: mediaCheckin(checkin) },
    deload: { ...deload, como: deload.sugerir ? DELOAD.texto : null },
  };
}
