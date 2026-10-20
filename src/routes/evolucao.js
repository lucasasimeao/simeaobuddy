// Evolução: os dados dos gráficos de uma pessoa (o aluno vê a si; o admin escolhe com ?aluno_id=).
// As contas vêm de src/treino/ (tonelagem, e1RM, status) e do mesmo resumo da aba Progressão.
import { Router } from 'express';
import { exigirLogin } from '../auth/permissoes.js';
import { tonelagem, cargaUtilizada } from '../treino/tonelagem.js';
import { melhorE1rm, repsNaCarga, statusProgressao } from '../treino/progressao.js';
import { progressaoDoPrograma } from '../db/progressao.js';
import { alunoAlvo, dadosDoCorpo } from './corpo.js';

export function evolucaoDe(db, alunoId) {
  const pessoa = db.prepare('SELECT id, nome FROM usuarios WHERE id = ?').get(alunoId);
  const treinos = db.prepare(`SELECT t.id, t.data, t.microciclo, t.programa_id, s.codigo, s.nome FROM treinos_realizados t
    JOIN sessoes_modelo s ON s.id = t.sessao_id WHERE t.aluno_id = ? AND t.status = 'finalizado' ORDER BY t.data, t.id`).all(alunoId);
  const series = treinos.length
    ? db.prepare(`SELECT s.treino_id, s.item_id, s.exercicio_id, s.tipo, s.carga, s.reps, s.rir, e.nome, i.reps_min, i.reps_max
        FROM series_realizadas s JOIN exercicios e ON e.id = s.exercicio_id JOIN itens_sessao i ON i.id = s.item_id
        WHERE s.treino_id IN (${treinos.map(() => '?').join(',')})`).all(...treinos.map((t) => t.id))
    : [];

  // Por exercício: uma linha por treino em que foi feito, com o status contra a vez anterior
  const porExercicio = new Map();
  for (const t of treinos) {
    const doTreino = series.filter((s) => s.treino_id === t.id);
    for (const exId of new Set(doTreino.map((s) => s.exercicio_id))) {
      const ss = doTreino.filter((s) => s.exercicio_id === exId);
      if (!porExercicio.has(exId)) porExercicio.set(exId, { id: exId, nome: ss[0].nome, historico: [], _anterior: null });
      const ex = porExercicio.get(exId);
      ex.historico.push({
        data: t.data, treino_id: t.id, codigo: t.codigo, microciclo: t.microciclo,
        tonelagem: tonelagem(ss), carga: cargaUtilizada(ss), reps: repsNaCarga(ss), e1rm: melhorE1rm(ss),
        status: statusProgressao(ss, ex._anterior, { reps_min: ss[0].reps_min, reps_max: ss[0].reps_max }),
      });
      ex._anterior = ss;
    }
  }
  const exercicios = [...porExercicio.values()].map(({ _anterior, ...e }) => e).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const ativo = db.prepare("SELECT id FROM programas WHERE aluno_id = ? AND status = 'ativo'").get(alunoId);
  const prog = ativo ? progressaoDoPrograma(db, ativo.id) : null;
  return {
    pessoa,
    treinos: treinos.map((t) => ({ id: t.id, data: t.data, codigo: t.codigo, nome: t.nome, microciclo: t.microciclo,
      tonelagem: tonelagem(series.filter((s) => s.treino_id === t.id)) })),
    exercicios,
    micros: prog ? prog.micros.filter((m) => m.treinos_feitos) : [],
    corpo: dadosDoCorpo(db, alunoId),
  };
}

export function rotasEvolucao(db) {
  const r = Router();
  r.get('/', exigirLogin, (req, res) => {
    const alunoId = alunoAlvo(req, res);
    if (!alunoId) return;
    if (!db.prepare('SELECT 1 FROM usuarios WHERE id = ?').get(alunoId)) return res.status(404).json({ erro: 'Pessoa não encontrada.' });
    res.json(evolucaoDe(db, alunoId));
  });
  return r;
}
