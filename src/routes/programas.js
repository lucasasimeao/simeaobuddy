// Programas (blocos), treinos A–E, itens e a escada. Só o admin monta; o dono do programa só lê.
import { Router } from 'express';
import { exigirLogin, exigirAdmin } from '../auth/permissoes.js';
import { validarPrograma, validarSessao, validarItem, validarSemana } from '../validacao.js';
import { carregarPrograma, copiarPrograma, criarItem, completarSemanas, salvarSemanas } from '../db/programas.js';

export function rotasProgramas(db) {
  const r = Router();

  const programaDaSessao = (sid) => db.prepare('SELECT programa_id FROM sessoes_modelo WHERE id = ?').get(sid)?.programa_id;
  const programaDoItem = (iid) => db.prepare(`SELECT s.programa_id FROM itens_sessao i JOIN sessoes_modelo s ON s.id = i.sessao_id
    WHERE i.id = ?`).get(iid)?.programa_id;
  const tocar = (pid) => db.prepare("UPDATE programas SET atualizado_em = datetime('now') WHERE id = ?").run(pid);
  const devolver = (res, pid, status = 200) => res.status(status).json(carregarPrograma(db, pid));

  // Quem pode receber programa: alunos ativos + o próprio admin (o Lucas também treina)
  const pessoaValida = (id) => db.prepare("SELECT id FROM usuarios WHERE id = ? AND (papel = 'admin' OR status = 'ativo')").get(id);

  r.get('/pessoas', exigirAdmin, (req, res) => {
    const pessoas = db.prepare(`SELECT id, nome, papel FROM usuarios WHERE papel = 'admin' OR status = 'ativo'
      ORDER BY papel = 'admin' DESC, nome COLLATE NOCASE`).all();
    res.json({ pessoas });
  });

  r.get('/', exigirAdmin, (req, res) => {
    const programas = db.prepare(`SELECT p.id, p.nome, p.aluno_id, p.status, p.n_microciclos, p.atualizado_em, p.criado_em,
        u.nome AS aluno_nome, (SELECT count(*) FROM sessoes_modelo s WHERE s.programa_id = p.id) AS n_sessoes
      FROM programas p LEFT JOIN usuarios u ON u.id = p.aluno_id
      ORDER BY p.aluno_id IS NOT NULL, CASE p.status WHEN 'ativo' THEN 0 WHEN 'rascunho' THEN 1 ELSE 2 END, u.nome COLLATE NOCASE, p.id DESC`).all();
    res.json({ programas });
  });

  // O programa ativo de quem está logado (usado pela tela Hoje na Etapa 4)
  r.get('/meu', exigirLogin, (req, res) => {
    const p = db.prepare("SELECT id FROM programas WHERE aluno_id = ? AND status = 'ativo'").get(req.usuario.id);
    if (!p) return res.json({ programa: null });
    res.json(carregarPrograma(db, p.id));
  });

  r.get('/:id', exigirLogin, (req, res) => {
    const dados = carregarPrograma(db, Number(req.params.id));
    const dono = dados && dados.programa.aluno_id === req.usuario.id;
    if (!dados || (req.usuario.papel !== 'admin' && !dono)) return res.status(404).json({ erro: 'Programa não encontrado.' });
    res.json(dados);
  });

  r.post('/', exigirAdmin, (req, res) => {
    const { dados, erro } = validarPrograma(req.body);
    if (erro) return res.status(400).json({ erro });
    const alunoId = req.body?.aluno_id ? Number(req.body.aluno_id) : null;
    if (alunoId && !pessoaValida(alunoId)) return res.status(400).json({ erro: 'Escolha um aluno ativo.' });
    const { lastInsertRowid } = db.prepare(`INSERT INTO programas (aluno_id, nome, descricao, n_microciclos, inicio, status)
      VALUES (?, ?, ?, ?, ?, 'rascunho')`).run(alunoId, dados.nome, dados.descricao, dados.n_microciclos, dados.inicio);
    devolver(res, Number(lastInsertRowid), 201);
  });

  r.put('/:id', exigirAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT 1 FROM programas WHERE id = ?').get(id)) return res.status(404).json({ erro: 'Programa não encontrado.' });
    const { dados, erro } = validarPrograma(req.body);
    if (erro) return res.status(400).json({ erro });
    db.prepare(`UPDATE programas SET nome = ?, descricao = ?, n_microciclos = ?, inicio = ?, atualizado_em = datetime('now')
      WHERE id = ?`).run(dados.nome, dados.descricao, dados.n_microciclos, dados.inicio, id);
    completarSemanas(db, id, dados.n_microciclos);
    devolver(res, id);
  });

  // Copiar o modelo (ou qualquer programa) para uma pessoa. aluno_id vazio = nova cópia de modelo.
  r.post('/:id/copiar', exigirAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT 1 FROM programas WHERE id = ?').get(id)) return res.status(404).json({ erro: 'Programa não encontrado.' });
    const alunoId = req.body?.aluno_id ? Number(req.body.aluno_id) : null;
    if (alunoId && !pessoaValida(alunoId)) return res.status(400).json({ erro: 'Escolha um aluno ativo.' });
    const nome = req.body?.nome ? validarPrograma({ nome: req.body.nome, n_microciclos: 3 }) : null;
    if (nome?.erro) return res.status(400).json({ erro: nome.erro });
    devolver(res, copiarPrograma(db, id, alunoId, nome?.dados.nome), 201);
  });

  // Ativar (arquiva o ativo anterior da mesma pessoa), arquivar ou voltar para rascunho
  r.post('/:id/status', exigirAdmin, (req, res) => {
    const id = Number(req.params.id);
    const p = db.prepare('SELECT * FROM programas WHERE id = ?').get(id);
    if (!p) return res.status(404).json({ erro: 'Programa não encontrado.' });
    const status = req.body?.status;
    if (!['ativo', 'arquivado', 'rascunho'].includes(status)) return res.status(400).json({ erro: 'Status inválido.' });
    if (!p.aluno_id) return res.status(400).json({ erro: 'Modelos não são ativados. Copie o modelo para uma pessoa.' });
    db.exec('BEGIN');
    if (status === 'ativo') {
      db.prepare("UPDATE programas SET status = 'arquivado' WHERE aluno_id = ? AND status = 'ativo' AND id <> ?").run(p.aluno_id, id);
    }
    db.prepare("UPDATE programas SET status = ?, atualizado_em = datetime('now') WHERE id = ?").run(status, id);
    db.exec('COMMIT');
    devolver(res, id);
  });

  // --- Treinos (sessões) ---
  r.post('/:id/sessoes', exigirAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT 1 FROM programas WHERE id = ?').get(id)) return res.status(404).json({ erro: 'Programa não encontrado.' });
    const { dados, erro } = validarSessao(req.body);
    if (erro) return res.status(400).json({ erro });
    const { ordem } = db.prepare('SELECT coalesce(max(ordem), 0) + 1 AS ordem FROM sessoes_modelo WHERE programa_id = ?').get(id);
    db.prepare('INSERT INTO sessoes_modelo (programa_id, codigo, nome, ordem) VALUES (?, ?, ?, ?)').run(id, dados.codigo, dados.nome, ordem);
    tocar(id);
    devolver(res, id, 201);
  });

  r.put('/sessoes/:sid', exigirAdmin, (req, res) => {
    const pid = programaDaSessao(Number(req.params.sid));
    if (!pid) return res.status(404).json({ erro: 'Treino não encontrado.' });
    const { dados, erro } = validarSessao(req.body);
    if (erro) return res.status(400).json({ erro });
    db.prepare('UPDATE sessoes_modelo SET codigo = ?, nome = ? WHERE id = ?').run(dados.codigo, dados.nome, Number(req.params.sid));
    tocar(pid);
    devolver(res, pid);
  });

  // Treino ou exercício com séries registradas não pode ser apagado (o histórico depende dele)
  const temHistoricoSessao = (sid) => db.prepare('SELECT 1 FROM treinos_realizados WHERE sessao_id = ? LIMIT 1').get(sid);
  const temHistoricoItem = (iid) => db.prepare('SELECT 1 FROM series_realizadas WHERE item_id = ? LIMIT 1').get(iid)
    || db.prepare('SELECT 1 FROM trocas_treino WHERE item_id = ? LIMIT 1').get(iid);
  const MSG_HISTORICO = 'Já tem treino registrado aqui, então não dá para apagar. Para mudar, crie um programa novo (copie este).';

  r.delete('/sessoes/:sid', exigirAdmin, (req, res) => {
    const sid = Number(req.params.sid);
    const pid = programaDaSessao(sid);
    if (!pid) return res.status(404).json({ erro: 'Treino não encontrado.' });
    if (temHistoricoSessao(sid)) return res.status(409).json({ erro: MSG_HISTORICO });
    db.exec('BEGIN');
    db.prepare('DELETE FROM itens_semana WHERE item_id IN (SELECT id FROM itens_sessao WHERE sessao_id = ?)').run(sid);
    db.prepare('DELETE FROM itens_sessao WHERE sessao_id = ?').run(sid);
    db.prepare('DELETE FROM sessoes_modelo WHERE id = ?').run(sid);
    db.exec('COMMIT');
    tocar(pid);
    devolver(res, pid);
  });

  // --- Itens (exercícios do treino) ---
  r.post('/sessoes/:sid/itens', exigirAdmin, (req, res) => {
    const sid = Number(req.params.sid);
    const pid = programaDaSessao(sid);
    if (!pid) return res.status(404).json({ erro: 'Treino não encontrado.' });
    const ex = db.prepare('SELECT id FROM exercicios WHERE id = ? AND ativo = 1').get(Number(req.body?.exercicio_id));
    if (!ex) return res.status(400).json({ erro: 'Escolha um exercício da biblioteca.' });
    criarItem(db, sid, ex.id);
    tocar(pid);
    devolver(res, pid, 201);
  });

  r.put('/itens/:iid', exigirAdmin, (req, res) => {
    const iid = Number(req.params.iid);
    const pid = programaDoItem(iid);
    if (!pid) return res.status(404).json({ erro: 'Exercício do treino não encontrado.' });
    const { dados, erro } = validarItem(req.body);
    if (erro) return res.status(400).json({ erro });
    let exercicioId = db.prepare('SELECT exercicio_id FROM itens_sessao WHERE id = ?').get(iid).exercicio_id;
    if (req.body?.exercicio_id && Number(req.body.exercicio_id) !== exercicioId) {
      const ex = db.prepare('SELECT id FROM exercicios WHERE id = ? AND ativo = 1').get(Number(req.body.exercicio_id));
      if (!ex) return res.status(400).json({ erro: 'Escolha um exercício da biblioteca.' });
      exercicioId = ex.id;
    }
    db.prepare(`UPDATE itens_sessao SET exercicio_id = ?, papel = ?, feeders = ?, warmup = ?, reps_min = ?, reps_max = ?, cadencia = ?,
      descanso_seg = ?, metodo = ?, mr_blocos = ?, mr_reps = ?, mr_descanso_seg = ?, observacoes = ? WHERE id = ?`)
      .run(exercicioId, dados.papel, dados.feeders ? JSON.stringify(dados.feeders) : null, dados.warmup, dados.reps_min, dados.reps_max,
        dados.cadencia, dados.descanso_seg, dados.metodo, dados.mr_blocos, dados.mr_reps, dados.mr_descanso_seg, dados.observacoes, iid);
    tocar(pid);
    devolver(res, pid);
  });

  r.delete('/itens/:iid', exigirAdmin, (req, res) => {
    const iid = Number(req.params.iid);
    const pid = programaDoItem(iid);
    if (!pid) return res.status(404).json({ erro: 'Exercício do treino não encontrado.' });
    if (temHistoricoItem(iid)) return res.status(409).json({ erro: MSG_HISTORICO });
    db.exec('BEGIN');
    db.prepare('DELETE FROM itens_semana WHERE item_id = ?').run(iid);
    db.prepare('DELETE FROM itens_sessao WHERE id = ?').run(iid);
    db.exec('COMMIT');
    tocar(pid);
    devolver(res, pid);
  });

  // Sobe (-1) ou desce (+1) o exercício no treino
  r.post('/itens/:iid/mover', exigirAdmin, (req, res) => {
    const iid = Number(req.params.iid);
    const pid = programaDoItem(iid);
    if (!pid) return res.status(404).json({ erro: 'Exercício do treino não encontrado.' });
    const item = db.prepare('SELECT id, sessao_id FROM itens_sessao WHERE id = ?').get(iid);
    const lista = db.prepare('SELECT id FROM itens_sessao WHERE sessao_id = ? ORDER BY ordem, id').all(item.sessao_id).map((x) => x.id);
    const i = lista.indexOf(iid);
    const j = i + (Number(req.body?.direcao) < 0 ? -1 : 1);
    if (j >= 0 && j < lista.length) {
      [lista[i], lista[j]] = [lista[j], lista[i]];
      const salvar = db.prepare('UPDATE itens_sessao SET ordem = ? WHERE id = ?');
      db.exec('BEGIN');
      lista.forEach((id, k) => salvar.run(k + 1, id));
      db.exec('COMMIT');
      tocar(pid);
    }
    devolver(res, pid);
  });

  // A escada do item: [{ microciclo, n_ws, rir_ws, n_top, rir_top, n_bo, pct_bo, n_mr }]
  r.put('/itens/:iid/semanas', exigirAdmin, (req, res) => {
    const iid = Number(req.params.iid);
    const pid = programaDoItem(iid);
    if (!pid) return res.status(404).json({ erro: 'Exercício do treino não encontrado.' });
    const { n_microciclos: n } = db.prepare('SELECT n_microciclos FROM programas WHERE id = ?').get(pid);
    const entrada = Array.isArray(req.body?.semanas) ? req.body.semanas : [];
    const semanas = [];
    for (const s of entrada) {
      const { dados, erro } = validarSemana(s);
      if (erro) return res.status(400).json({ erro });
      if (dados.microciclo > n) return res.status(400).json({ erro: `O programa tem só ${n} semanas.` });
      semanas.push(dados);
    }
    salvarSemanas(db, iid, semanas);
    tocar(pid);
    devolver(res, pid);
  });

  return r;
}
