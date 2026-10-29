// Alunos e anamnese. Só o admin lista, aprova e edita; o aluno só lê os próprios dados.
import { Router } from 'express';
import { exigirAdmin, podeVerAluno } from '../auth/permissoes.js';
import { encerrarTodas } from '../auth/sessoes.js';
import { validarAnamnese, validarNome, CAMPOS_ANAMNESE } from '../validacao.js';

export function rotasAlunos(db) {
  const r = Router();

  const buscarAluno = (id) => db.prepare(
    "SELECT id, nome, papel, status, email, foto_url, criado_em, ultimo_acesso FROM usuarios WHERE id = ? AND papel = 'aluno'",
  ).get(id);

  r.get('/', exigirAdmin, (req, res) => {
    const alunos = db.prepare(`
      SELECT u.id, u.nome, u.status, u.email, u.foto_url, u.criado_em, u.ultimo_acesso, a.objetivo, a.nivel
      FROM usuarios u LEFT JOIN alunos a ON a.usuario_id = u.id
      WHERE u.papel = 'aluno'
      ORDER BY CASE u.status WHEN 'pendente' THEN 0 WHEN 'ativo' THEN 1 ELSE 2 END, u.nome COLLATE NOCASE`).all();
    res.json({ alunos });
  });

  r.get('/:id', podeVerAluno, (req, res) => {
    const aluno = buscarAluno(Number(req.params.id));
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' });
    const anamnese = db.prepare('SELECT * FROM alunos WHERE usuario_id = ?').get(aluno.id) || {};
    delete anamnese.usuario_id;
    res.json({ aluno, anamnese });
  });

  r.put('/:id', exigirAdmin, (req, res) => {
    const aluno = buscarAluno(Number(req.params.id));
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' });
    const nome = validarNome(req.body?.nome);
    if (nome.erro) return res.status(400).json({ erro: nome.erro });
    const { dados, erro } = validarAnamnese(req.body?.anamnese);
    if (erro) return res.status(400).json({ erro });

    db.prepare('UPDATE usuarios SET nome = ? WHERE id = ?').run(nome.valor, aluno.id);
    const colunas = CAMPOS_ANAMNESE.join(', ');
    const marcas = CAMPOS_ANAMNESE.map(() => '?').join(', ');
    const atualizar = CAMPOS_ANAMNESE.map((c) => `${c} = excluded.${c}`).join(', ');
    db.prepare(`INSERT INTO alunos (usuario_id, ${colunas}, atualizado_em) VALUES (?, ${marcas}, datetime('now'))
      ON CONFLICT (usuario_id) DO UPDATE SET ${atualizar}, atualizado_em = excluded.atualizado_em`)
      .run(aluno.id, ...CAMPOS_ANAMNESE.map((c) => dados[c]));
    res.json({ ok: true });
  });

  // Aprovar (ativo) ou desativar (inativo). Nada é apagado.
  r.post('/:id/status', exigirAdmin, (req, res) => {
    const aluno = buscarAluno(Number(req.params.id));
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' });
    const status = req.body?.status;
    if (!['ativo', 'inativo'].includes(status)) return res.status(400).json({ erro: 'Status inválido.' });
    db.prepare('UPDATE usuarios SET status = ? WHERE id = ?').run(status, aluno.id);
    db.prepare('INSERT OR IGNORE INTO alunos (usuario_id) VALUES (?)').run(aluno.id);
    if (status === 'inativo') encerrarTodas(db, aluno.id);
    res.json({ ok: true });
  });

  return r;
}
