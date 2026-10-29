// Treinos realizados: montar a ficha (o que fazer + o que já foi feito + o micro anterior) e o resumo.
import { carregarPrograma } from './programas.js';
import { proximoTreino, semanaDaEscada, microcicloAtual, feitosNoMicrociclo } from '../treino/sequencia.js';
import { tonelagem, totalReps, cargaUtilizada, variacao } from '../treino/tonelagem.js';
import { sugestaoCarga, statusProgressao, melhorE1rm } from '../treino/progressao.js';
import { semanaIso } from '../treino/checkin.js';
import { progressaoDoPrograma } from './progressao.js';

export const hojeLocal = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso do PC

const lerSerie = (s) => ({ id: s.id, uuid: s.uuid, item_id: s.item_id, exercicio_id: s.exercicio_id, posicao: s.posicao,
  bloco: s.bloco, tipo: s.tipo, carga: s.carga, reps: s.reps, rir: s.rir });

export function finalizadosDoPrograma(db, programaId) {
  return db.prepare("SELECT id, sessao_id, microciclo, data FROM treinos_realizados WHERE programa_id = ? AND status = 'finalizado' ORDER BY id")
    .all(programaId);
}

// Quantas séries o item pede na semana (para avisar o que ficou sem registro)
export function seriesPlanejadas(item) {
  const s = item.semana;
  if (!s) return 0;
  if (item.metodo === 'muscle_round') return (s.n_mr || 0) * (item.mr_blocos || 4);
  return s.series.length;
}

// Última vez que a pessoa fez este exercício (fora este treino): { treino_id, data, series }
function ultimaVez(db, alunoId, exercicioId, foraTreinoId) {
  const t = db.prepare(`SELECT t.id, t.data FROM treinos_realizados t
    WHERE t.aluno_id = ? AND t.status = 'finalizado' AND t.id <> ?
      AND EXISTS (SELECT 1 FROM series_realizadas s WHERE s.treino_id = t.id AND s.exercicio_id = ?)
    ORDER BY t.data DESC, t.id DESC LIMIT 1`).get(alunoId, foraTreinoId, exercicioId);
  if (!t) return null;
  const series = db.prepare('SELECT * FROM series_realizadas WHERE treino_id = ? AND exercicio_id = ? ORDER BY posicao, bloco')
    .all(t.id, exercicioId).map(lerSerie);
  return { treino_id: t.id, data: t.data, series };
}

// Melhor e1RM da pessoa neste exercício antes deste treino (para marcar PR)
function recordeAnterior(db, alunoId, exercicioId, foraTreinoId) {
  const series = db.prepare(`SELECT s.tipo, s.carga, s.reps, s.rir FROM series_realizadas s JOIN treinos_realizados t ON t.id = s.treino_id
    WHERE t.aluno_id = ? AND t.status = 'finalizado' AND t.id <> ? AND s.exercicio_id = ?`).all(alunoId, foraTreinoId, exercicioId);
  return melhorE1rm(series);
}

function exercicioResumo(e) {
  return {
    id: e.id, nome: e.nome, grupo_primario: e.grupo_primario, equipamento: e.equipamento, incremento_kg: e.incremento_kg,
    video_url: e.video_url, observacoes: e.observacoes, substitutos: JSON.parse(e.substitutos),
  };
}

// A ficha completa do treino
export function montarFicha(db, treinoId) {
  const treino = db.prepare('SELECT * FROM treinos_realizados WHERE id = ?').get(treinoId);
  if (!treino) return null;
  const prog = carregarPrograma(db, treino.programa_id);
  const sessao = prog.sessoes.find((s) => s.id === treino.sessao_id);
  const trocas = new Map(db.prepare('SELECT item_id, exercicio_id FROM trocas_treino WHERE treino_id = ?').all(treinoId)
    .map((t) => [t.item_id, t.exercicio_id]));
  const registradas = db.prepare('SELECT * FROM series_realizadas WHERE treino_id = ? ORDER BY posicao, bloco').all(treinoId).map(lerSerie);
  const exercicioPorId = db.prepare('SELECT * FROM exercicios WHERE id = ?');

  const itens = (sessao?.itens || []).map((item) => {
    const trocado = trocas.get(item.id);
    const atual = exercicioResumo(exercicioPorId.get(trocado || item.exercicio_id));
    const subsIds = item.exercicio.substitutos.filter((id) => id !== atual.id);
    if (trocado) subsIds.unshift(item.exercicio_id); // dá para voltar ao original
    const substitutos = subsIds.map((id) => exercicioPorId.get(id)).filter((e) => e && e.ativo).map((e) => ({ id: e.id, nome: e.nome }));
    const r = {
      id: item.id, ordem: item.ordem, papel: item.papel, tem_warmup: item.tem_warmup, feeders: item.feeders_efetivas,
      reps_min: item.reps_min, reps_max: item.reps_max, cadencia: item.cadencia, descanso_seg: item.descanso_seg,
      metodo: item.metodo, mr_blocos: item.mr_blocos, mr_reps: item.mr_reps, mr_descanso_seg: item.mr_descanso_seg,
      observacoes: item.observacoes,
      exercicio: atual,
      exercicio_original: trocado ? { id: item.exercicio.id, nome: item.exercicio.nome } : null,
      substitutos,
      semana: item.semanas.find((w) => w.microciclo === treino.semana_escada) || null,
      registradas: registradas.filter((s) => s.item_id === item.id),
      anterior: ultimaVez(db, treino.aluno_id, atual.id, treino.id),
    };
    r.planejadas = seriesPlanejadas(r);
    r.recorde_e1rm = recordeAnterior(db, treino.aluno_id, atual.id, treino.id);
    r.sugestao = sugestaoCarga(r.anterior?.series, { ...r, incremento_kg: atual.incremento_kg, rir_top: r.semana?.rir_top });
    return r;
  });

  return {
    treino,
    programa: { id: prog.programa.id, nome: prog.programa.nome, n_microciclos: prog.programa.n_microciclos },
    sessao: sessao ? { id: sessao.id, codigo: sessao.codigo, nome: sessao.nome } : null,
    itens,
  };
}

// Resumo para o fim do treino: duração, tonelagem por exercício e total, comparação com a última vez
export function resumoTreino(ficha) {
  const { treino } = ficha;
  const exercicios = ficha.itens.map((item) => {
    const ton = tonelagem(item.registradas);
    const tonAnt = item.anterior ? tonelagem(item.anterior.series) : null;
    return {
      item_id: item.id,
      nome: item.exercicio.nome,
      tonelagem: ton,
      reps: totalReps(item.registradas),
      carga: cargaUtilizada(item.registradas),
      tonelagem_anterior: tonAnt,
      variacao: variacao(ton, tonAnt),
      status: statusProgressao(item.registradas, item.anterior?.series, item),
      e1rm: melhorE1rm(item.registradas),
      pr: (() => {
        const e = melhorE1rm(item.registradas);
        return e != null && item.recorde_e1rm != null && e > item.recorde_e1rm;
      })(),
      registradas: item.registradas.length,
      planejadas: item.planejadas,
    };
  });
  const total = Math.round(exercicios.reduce((t, e) => t + e.tonelagem, 0) * 100) / 100;
  const comAnterior = exercicios.filter((e) => e.tonelagem_anterior != null);
  const totalAnt = comAnterior.length ? comAnterior.reduce((t, e) => t + e.tonelagem_anterior, 0) : null;
  const totalComparavel = comAnterior.reduce((t, e) => t + e.tonelagem, 0);
  const fim = treino.fim ? Date.parse(treino.fim.replace(' ', 'T') + 'Z') : Date.now();
  return {
    duracao_min: Math.max(1, Math.round((fim - Date.parse(treino.inicio.replace(' ', 'T') + 'Z')) / 60000)),
    tonelagem: total,
    variacao: variacao(totalComparavel, totalAnt),
    faltando: exercicios.reduce((t, e) => t + Math.max(e.planejadas - e.registradas, 0), 0),
    prs: exercicios.filter((e) => e.pr).length,
    exercicios,
  };
}

// O que mostrar na tela Hoje
export function resumoHoje(db, alunoId) {
  const emAndamento = db.prepare("SELECT id, sessao_id FROM treinos_realizados WHERE aluno_id = ? AND status = 'em_andamento'").get(alunoId) || null;
  const p = db.prepare("SELECT id FROM programas WHERE aluno_id = ? AND status = 'ativo'").get(alunoId);
  if (!p) return { programa: null, em_andamento: emAndamento };
  const prog = carregarPrograma(db, p.id);
  const finalizados = finalizadosDoPrograma(db, p.id);
  const prox = proximoTreino(prog.sessoes, finalizados);
  const atual = microcicloAtual(finalizados);
  const feitos = feitosNoMicrociclo(finalizados, atual);
  const n = prog.programa.n_microciclos;
  const ultimo = db.prepare(`SELECT t.id, t.data, s.codigo, s.nome FROM treinos_realizados t JOIN sessoes_modelo s ON s.id = t.sessao_id
    WHERE t.aluno_id = ? AND t.status = 'finalizado' ORDER BY t.data DESC, t.id DESC LIMIT 1`).get(alunoId);
  if (ultimo) {
    const series = db.prepare('SELECT * FROM series_realizadas WHERE treino_id = ?').all(ultimo.id);
    ultimo.tonelagem = tonelagem(series);
  }
  const analise = progressaoDoPrograma(db, p.id);
  const checkinFeito = Boolean(db.prepare('SELECT 1 FROM checkins WHERE aluno_id = ? AND semana_iso = ?').get(alunoId, semanaIso(hojeLocal())));
  const microAnalisado = analise.micros.filter((m) => m.treinos_feitos).at(-1) || null;
  return {
    deload: analise.deload,
    fadiga: microAnalisado && { microciclo: microAnalisado.microciclo, ...microAnalisado.fadiga },
    checkin_pendente: !checkinFeito,
    programa: { id: prog.programa.id, nome: prog.programa.nome, n_microciclos: n },
    em_andamento: emAndamento,
    proximo: prox && (() => {
      const s = prog.sessoes.find((x) => x.id === prox.sessao_id);
      return { sessao_id: s.id, codigo: s.codigo, nome: s.nome, microciclo: prox.microciclo,
        semana: semanaDaEscada(prox.microciclo, n), n_exercicios: s.itens.length };
    })(),
    microciclo_atual: atual,
    sessoes: prog.sessoes.map((s) => ({ id: s.id, codigo: s.codigo, nome: s.nome, n_exercicios: s.itens.length,
      feito: finalizados.length > 0 && feitos.has(s.id) })),
    ultimo: ultimo || null,
  };
}

// Treinos de um programa com as séries (tela Planilha e o Excel): todos menos os descartados
export function treinosDaPlanilha(db, programaId) {
  const treinos = db.prepare(`SELECT id, sessao_id, microciclo, semana_escada, data, status, observacao FROM treinos_realizados
    WHERE programa_id = ? AND status <> 'descartado' ORDER BY microciclo, id`).all(programaId);
  const series = treinos.length
    ? db.prepare(`SELECT s.treino_id, s.item_id, s.exercicio_id, s.posicao, s.bloco, s.tipo, s.carga, s.reps, s.rir
        FROM series_realizadas s WHERE s.treino_id IN (${treinos.map(() => '?').join(',')}) ORDER BY s.posicao, s.bloco`).all(...treinos.map((t) => t.id))
    : [];
  return treinos.map((t) => ({ ...t, series: series.filter((s) => s.treino_id === t.id) }));
}
