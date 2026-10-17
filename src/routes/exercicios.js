// Biblioteca de exercícios. Todos os logados consultam; só o admin cria, edita e desativa.
import { Router } from 'express';
import { exigirLogin, exigirAdmin } from '../auth/permissoes.js';
import { validarExercicio } from '../validacao.js';
import { textoBusca } from '../db/biblioteca.js';
import { GRUPOS, EQUIPAMENTOS, normalizar } from '../treino/grupos.js';

const lerLinha = (e) => e && ({
  ...e,
  estavel: Boolean(e.estavel),
  ativo: Boolean(e.ativo),
  grupos_secundarios: JSON.parse(e.grupos_secundarios),
  substitutos: JSON.parse(e.substitutos),
});

const SQL_GRUPO = `(grupo_primario = ? OR EXISTS (
  SELECT 1 FROM json_each(grupos_secundarios) WHERE json_extract(value, '$.grupo') = ?))`;

export function rotasExercicios(db) {
  const r = Router();
  const buscar = (id) => lerLinha(db.prepare('SELECT * FROM exercicios WHERE id = ?').get(id));

  r.get('/opcoes', exigirLogin, (req, res) => res.json({ grupos: GRUPOS, equipamentos: EQUIPAMENTOS }));

  // ?busca=supino maq&grupo=peito&inativos=1 (inativos só para o admin)
  r.get('/', exigirLogin, (req, res) => {
    const onde = [];
    const valores = [];
    const verInativos = req.usuario.papel === 'admin' && req.query.inativos === '1';
    if (!verInativos) onde.push('ativo = 1');
    const grupo = String(req.query.grupo || '');
    if (grupo) {
      onde.push(SQL_GRUPO);
      valores.push(grupo, grupo);
    }
    for (const termo of normalizar(req.query.busca).split(' ').filter(Boolean).slice(0, 6)) {
      onde.push("nome_busca LIKE ? ESCAPE '!'");
      valores.push(`%${termo.replace(/[!%_]/g, (c) => `!${c}`)}%`);
    }
    // Com filtro de grupo, quem tem o grupo como principal vem primeiro
    const sql = `SELECT * FROM exercicios ${onde.length ? `WHERE ${onde.join(' AND ')}` : ''}
      ORDER BY CASE WHEN grupo_primario = ? THEN 0 ELSE 1 END, nome COLLATE NOCASE`;
    res.json({ exercicios: db.prepare(sql).all(...valores, grupo).map(lerLinha) });
  });

  r.get('/:id', exigirLogin, (req, res) => {
    const e = buscar(Number(req.params.id));
    if (!e || (!e.ativo && req.usuario.papel !== 'admin')) return res.status(404).json({ erro: 'Exercício não encontrado.' });
    const marcas = e.substitutos.map(() => '?').join(',');
    const subs = marcas ? db.prepare(`SELECT id, nome, equipamento FROM exercicios WHERE id IN (${marcas}) AND ativo = 1`).all(...e.substitutos) : [];
    e.substitutos_info = e.substitutos.map((id) => subs.find((s) => s.id === id)).filter(Boolean);
    res.json({ exercicio: e });
  });

  function salvar(req, res, id) {
    const { dados, erro } = validarExercicio(req.body);
    if (erro) return res.status(400).json({ erro });
    if (id) dados.substitutos = dados.substitutos.filter((s) => s !== id);
    if (dados.substitutos.length) {
      const marcas = dados.substitutos.map(() => '?').join(',');
      const { n } = db.prepare(`SELECT count(*) AS n FROM exercicios WHERE id IN (${marcas})`).get(...dados.substitutos);
      if (n !== dados.substitutos.length) return res.status(400).json({ erro: 'Um dos substitutos não existe.' });
    }
    const repetido = db.prepare('SELECT id FROM exercicios WHERE nome = ? COLLATE NOCASE AND id IS NOT ?').get(dados.nome, id ?? null);
    if (repetido) return res.status(409).json({ erro: 'Já existe um exercício com esse nome.' });

    const valores = [dados.nome, textoBusca(dados.nome, dados.apelidos), dados.apelidos, dados.grupo_primario,
      JSON.stringify(dados.grupos_secundarios), dados.tipo, dados.estavel ? 1 : 0, dados.equipamento, dados.incremento_kg,
      dados.video_url, dados.observacoes, JSON.stringify(dados.substitutos)];
    if (id) {
      db.prepare(`UPDATE exercicios SET nome = ?, nome_busca = ?, apelidos = ?, grupo_primario = ?, grupos_secundarios = ?, tipo = ?,
        estavel = ?, equipamento = ?, incremento_kg = ?, video_url = ?, observacoes = ?, substitutos = ?, atualizado_em = datetime('now')
        WHERE id = ?`).run(...valores, id);
      return res.json({ exercicio: buscar(id) });
    }
    const { lastInsertRowid } = db.prepare(`INSERT INTO exercicios (nome, nome_busca, apelidos, grupo_primario, grupos_secundarios,
      tipo, estavel, equipamento, incremento_kg, video_url, observacoes, substitutos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(...valores);
    res.status(201).json({ exercicio: buscar(Number(lastInsertRowid)) });
  }

  r.post('/', exigirAdmin, (req, res) => salvar(req, res, null));

  r.put('/:id', exigirAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!buscar(id)) return res.status(404).json({ erro: 'Exercício não encontrado.' });
    salvar(req, res, id);
  });

  // Desativar em vez de apagar: o exercício pode estar em fichas e treinos antigos
  r.post('/:id/ativo', exigirAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!buscar(id)) return res.status(404).json({ erro: 'Exercício não encontrado.' });
    db.prepare("UPDATE exercicios SET ativo = ?, atualizado_em = datetime('now') WHERE id = ?").run(req.body?.ativo ? 1 : 0, id);
    res.json({ exercicio: buscar(id) });
  });

  return r;
}
