// Check-in semanal: cada um responde o seu, uma vez por semana (dá para corrigir na mesma semana).
import { Router } from 'express';
import { exigirLogin } from '../auth/permissoes.js';
import { hojeLocal } from '../db/treinos.js';
import { PERGUNTAS, semanaIso, mediaCheckin } from '../treino/checkin.js';
import { validarCheckin } from '../validacao.js';

const comMedia = (c) => c && { ...c, media: mediaCheckin(c) };

export function rotasCheckins(db) {
  const r = Router();
  const daSemana = (alunoId, semana) => db.prepare('SELECT * FROM checkins WHERE aluno_id = ? AND semana_iso = ?').get(alunoId, semana);

  // O desta semana (ou null) e os últimos 8
  r.get('/', exigirLogin, (req, res) => {
    const semana = semanaIso(hojeLocal());
    const ultimos = db.prepare('SELECT * FROM checkins WHERE aluno_id = ? ORDER BY semana_iso DESC LIMIT 8').all(req.usuario.id);
    res.json({ semana, atual: comMedia(daSemana(req.usuario.id, semana)) || null, ultimos: ultimos.map(comMedia), perguntas: PERGUNTAS });
  });

  r.put('/', exigirLogin, (req, res) => {
    const { dados, erro } = validarCheckin(req.body, PERGUNTAS);
    if (erro) return res.status(400).json({ erro });
    const semana = semanaIso(hojeLocal());
    db.prepare(`INSERT INTO checkins (aluno_id, semana_iso, sono, energia, dor, estresse, dieta, comentario)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (aluno_id, semana_iso) DO UPDATE SET sono = excluded.sono, energia = excluded.energia, dor = excluded.dor,
        estresse = excluded.estresse, dieta = excluded.dieta, comentario = excluded.comentario, atualizado_em = datetime('now')`)
      .run(req.usuario.id, semana, dados.sono, dados.energia, dados.dor, dados.estresse, dados.dieta, dados.comentario);
    res.json({ checkin: comMedia(daSemana(req.usuario.id, semana)) });
  });

  return r;
}
