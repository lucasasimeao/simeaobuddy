// GET /api/saude → confirma que o servidor e o banco estão de pé.
import { Router } from 'express';

export function rotasSaude(db) {
  const r = Router();
  r.get('/', (req, res) => {
    const nome = db.prepare("SELECT valor FROM config WHERE chave = 'nome_app'").get()?.valor;
    const migracoes = db.prepare('SELECT count(*) AS n FROM _migracoes').get().n;
    res.json({ ok: true, app: nome, migracoes, hora: new Date().toISOString() });
  });
  return r;
}
