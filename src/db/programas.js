// Acesso aos programas: montar a árvore completa, criar itens com os padrões, copiar e semear o modelo.
import { escadaPadrao, descreverSemana, seriesDaSemana, seriesValidas } from '../treino/escada.js';
import { marcarWarmups, tabelaVolume } from '../treino/volume.js';
import { feedersDoItem } from '../treino/feeders.js';
import { NOME_MODELO, SESSOES, ESCADAS } from './dados/modelo.js';

const COLUNAS_SEMANA = ['n_ws', 'rir_ws', 'n_top', 'rir_top', 'n_bo', 'pct_bo', 'n_mr'];

function lerExercicio(e) {
  return {
    id: e.id, nome: e.nome, grupo_primario: e.grupo_primario, grupos_secundarios: JSON.parse(e.grupos_secundarios),
    tipo: e.tipo, estavel: Boolean(e.estavel), equipamento: e.equipamento, incremento_kg: e.incremento_kg,
    video_url: e.video_url, observacoes: e.observacoes, substitutos: JSON.parse(e.substitutos), ativo: Boolean(e.ativo),
  };
}

// Programa completo: { programa, sessoes: [{ ..., itens: [{ ..., exercicio, semanas, tem_warmup, feeders_efetivas }] }], volume }
export function carregarPrograma(db, id) {
  const programa = db.prepare(`SELECT p.*, u.nome AS aluno_nome FROM programas p
    LEFT JOIN usuarios u ON u.id = p.aluno_id WHERE p.id = ?`).get(id);
  if (!programa) return null;
  const sessoes = db.prepare('SELECT * FROM sessoes_modelo WHERE programa_id = ? ORDER BY ordem, id').all(id);
  const itens = db.prepare(`SELECT i.*, s.programa_id FROM itens_sessao i JOIN sessoes_modelo s ON s.id = i.sessao_id
    WHERE s.programa_id = ? ORDER BY i.ordem, i.id`).all(id);
  const exercicios = new Map();
  for (const e of db.prepare(`SELECT e.* FROM exercicios e WHERE e.id IN
    (SELECT i.exercicio_id FROM itens_sessao i JOIN sessoes_modelo s ON s.id = i.sessao_id WHERE s.programa_id = ?)`).all(id)) {
    exercicios.set(e.id, lerExercicio(e));
  }
  const semanas = db.prepare(`SELECT w.* FROM itens_semana w JOIN itens_sessao i ON i.id = w.item_id
    JOIN sessoes_modelo s ON s.id = i.sessao_id WHERE s.programa_id = ? AND w.microciclo <= ? ORDER BY w.microciclo`)
    .all(id, programa.n_microciclos);

  const todosItens = [];
  for (const sessao of sessoes) {
    const daSessao = itens.filter((i) => i.sessao_id === sessao.id).map((i) => {
      const item = {
        ...i,
        feeders: i.feeders ? JSON.parse(i.feeders) : null,
        exercicio: exercicios.get(i.exercicio_id),
        // descricao ("2 WS + 1 BO"), series [{tipo, rir|pct}] e validas já prontas para a tela
        semanas: semanas.filter((w) => w.item_id === i.id)
          .map((w) => ({ ...w, descricao: descreverSemana(w), series: seriesDaSemana(w), validas: seriesValidas(w) })),
      };
      item.feeders_efetivas = feedersDoItem(item);
      return item;
    });
    sessao.itens = marcarWarmups(daSessao);
    todosItens.push(...sessao.itens);
  }
  return { programa, sessoes, volume: tabelaVolume(todosItens, programa.n_microciclos) };
}

export function salvarSemanas(db, itemId, semanas) {
  const sql = db.prepare(`INSERT INTO itens_semana (item_id, microciclo, ${COLUNAS_SEMANA.join(', ')})
    VALUES (?, ?, ${COLUNAS_SEMANA.map(() => '?').join(', ')})
    ON CONFLICT (item_id, microciclo) DO UPDATE SET ${COLUNAS_SEMANA.map((c) => `${c} = excluded.${c}`).join(', ')}`);
  for (const s of semanas) sql.run(itemId, s.microciclo, ...COLUNAS_SEMANA.map((c) => s[c]));
}

// Descanso padrão (docs/05 regra 3): 180 s em hack, elevação pélvica, stiff, leg press e búlgaro; 150 s na puxada pronada
export function descansoPadrao(nome) {
  const n = nome.toLowerCase();
  if (/hack|pélvica|pelvica|stiff|leg press|búlgaro|bulgaro/.test(n)) return 180;
  if (/puxada.*(pronada|aberta)/.test(n)) return 150;
  return 120;
}

// Papel padrão: o 1º multi do grupo no treino é principal; outros multi, secundários; isolados, isolados
export function papelPadrao(db, sessaoId, exercicio) {
  if (exercicio.tipo === 'isolado') return 'isolado';
  const jaTem = db.prepare(`SELECT 1 FROM itens_sessao i JOIN exercicios e ON e.id = i.exercicio_id
    WHERE i.sessao_id = ? AND e.grupo_primario = ? LIMIT 1`).get(sessaoId, exercicio.grupo_primario);
  return jaTem ? 'secundario' : 'principal';
}

// Cria um item com os padrões do exercício (papel, descanso, faixa 5–9, escada)
export function criarItem(db, sessaoId, exercicioId, extras = {}, escada = null) {
  const ex = db.prepare('SELECT * FROM exercicios WHERE id = ?').get(exercicioId);
  if (!ex) throw new Error(`Exercício ${exercicioId} não existe`);
  const programa = db.prepare('SELECT p.n_microciclos FROM programas p JOIN sessoes_modelo s ON s.programa_id = p.id WHERE s.id = ?').get(sessaoId);
  const { ordem } = db.prepare('SELECT coalesce(max(ordem), 0) + 1 AS ordem FROM itens_sessao WHERE sessao_id = ?').get(sessaoId);
  const d = {
    papel: papelPadrao(db, sessaoId, ex), feeders: null, warmup: 'auto', reps_min: 5, reps_max: 9, cadencia: '2-0-1-0',
    descanso_seg: descansoPadrao(ex.nome), metodo: 'normal', mr_blocos: null, mr_reps: null, mr_descanso_seg: null, observacoes: null,
    ...extras,
  };
  const { lastInsertRowid } = db.prepare(`INSERT INTO itens_sessao (sessao_id, exercicio_id, ordem, papel, feeders, warmup, reps_min, reps_max,
    cadencia, descanso_seg, metodo, mr_blocos, mr_reps, mr_descanso_seg, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(sessaoId, exercicioId, ordem, d.papel, d.feeders ? JSON.stringify(d.feeders) : null, d.warmup, d.reps_min, d.reps_max,
      d.cadencia, d.descanso_seg, d.metodo, d.mr_blocos, d.mr_reps, d.mr_descanso_seg, d.observacoes);
  const id = Number(lastInsertRowid);
  const n = programa.n_microciclos;
  const semanas = escada
    ? Array.from({ length: n }, (_, i) => ({ microciclo: i + 1, ...escada[i % escada.length] }))
    : escadaPadrao({ ...ex, estavel: Boolean(ex.estavel) }, n, d.metodo);
  salvarSemanas(db, id, semanas);
  return id;
}

// Garante as linhas da escada quando o nº de microciclos aumenta (repete o bloco de 3)
export function completarSemanas(db, programaId, nMicrociclos) {
  const itens = db.prepare('SELECT i.id FROM itens_sessao i JOIN sessoes_modelo s ON s.id = i.sessao_id WHERE s.programa_id = ?').all(programaId);
  for (const { id } of itens) {
    const existentes = db.prepare('SELECT * FROM itens_semana WHERE item_id = ? ORDER BY microciclo').all(id);
    const base = existentes.filter((w) => w.microciclo <= 3);
    if (!base.length) continue;
    const faltam = [];
    for (let m = 1; m <= nMicrociclos; m++) {
      if (existentes.some((w) => w.microciclo === m)) continue;
      faltam.push({ ...base[(m - 1) % base.length], microciclo: m });
    }
    salvarSemanas(db, id, faltam);
  }
}

// Copia um programa (ou o modelo) inteiro para uma pessoa
export function copiarPrograma(db, origemId, alunoId, nome) {
  const origem = db.prepare('SELECT * FROM programas WHERE id = ?').get(origemId);
  if (!origem) throw new Error('Programa de origem não existe');
  const temAtivo = alunoId && db.prepare("SELECT 1 FROM programas WHERE aluno_id = ? AND status = 'ativo'").get(alunoId);
  db.exec('BEGIN');
  try {
    const { lastInsertRowid } = db.prepare(`INSERT INTO programas (aluno_id, nome, descricao, n_microciclos, status, origem_id)
      VALUES (?, ?, ?, ?, ?, ?)`).run(alunoId, nome || origem.nome, origem.descricao, origem.n_microciclos,
      alunoId && !temAtivo ? 'ativo' : 'rascunho', origemId);
    const novoId = Number(lastInsertRowid);
    for (const s of db.prepare('SELECT * FROM sessoes_modelo WHERE programa_id = ? ORDER BY ordem').all(origemId)) {
      const sid = Number(db.prepare('INSERT INTO sessoes_modelo (programa_id, codigo, nome, ordem) VALUES (?, ?, ?, ?)')
        .run(novoId, s.codigo, s.nome, s.ordem).lastInsertRowid);
      for (const i of db.prepare('SELECT * FROM itens_sessao WHERE sessao_id = ? ORDER BY ordem').all(s.id)) {
        const iid = Number(db.prepare(`INSERT INTO itens_sessao (sessao_id, exercicio_id, ordem, papel, feeders, warmup, reps_min, reps_max,
          cadencia, descanso_seg, metodo, mr_blocos, mr_reps, mr_descanso_seg, observacoes)
          SELECT ?, exercicio_id, ordem, papel, feeders, warmup, reps_min, reps_max, cadencia, descanso_seg, metodo,
          mr_blocos, mr_reps, mr_descanso_seg, observacoes FROM itens_sessao WHERE id = ?`).run(sid, i.id).lastInsertRowid);
        db.prepare(`INSERT INTO itens_semana (item_id, microciclo, ${COLUNAS_SEMANA.join(', ')})
          SELECT ?, microciclo, ${COLUNAS_SEMANA.join(', ')} FROM itens_semana WHERE item_id = ?`).run(iid, i.id);
      }
    }
    db.exec('COMMIT');
    return novoId;
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}

// Cria o modelo pronto quando ainda não existe nenhum modelo (dado de referência)
export function semearModelo(db) {
  if (db.prepare('SELECT 1 FROM programas WHERE aluno_id IS NULL LIMIT 1').get()) return null;
  const idDe = db.prepare('SELECT id FROM exercicios WHERE nome = ? COLLATE NOCASE');
  db.exec('BEGIN');
  try {
    const pid = Number(db.prepare(`INSERT INTO programas (aluno_id, nome, descricao, n_microciclos, status)
      VALUES (NULL, ?, ?, 3, 'ativo')`).run(NOME_MODELO, 'Modelo das fichas do Lucas: 5 treinos, volume em escada de 3 semanas.').lastInsertRowid);
    SESSOES.forEach((s, ordem) => {
      const sid = Number(db.prepare('INSERT INTO sessoes_modelo (programa_id, codigo, nome, ordem) VALUES (?, ?, ?, ?)')
        .run(pid, s.codigo, s.nome, ordem + 1).lastInsertRowid);
      for (const [nome, papel, escada, extras = {}] of s.itens) {
        const ex = idDe.get(nome);
        if (!ex) throw new Error(`Modelo: exercício "${nome}" não está na biblioteca`);
        criarItem(db, sid, ex.id, { papel, ...extras }, ESCADAS[escada]);
      }
    });
    db.exec('COMMIT');
    return pid;
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}
