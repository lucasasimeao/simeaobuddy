// Backup (admin): baixar tudo em JSON e restaurar a partir de um arquivo.
import { Router } from 'express';
import { exigirAdmin } from '../auth/permissoes.js';
import { gerarBackup, restaurarBackup, validarBackup, copiaDeSeguranca } from '../db/backup.js';

export function rotasBackup(db, { pastaBackups }) {
  const r = Router();

  r.get('/', exigirAdmin, (req, res) => {
    const backup = gerarBackup(db);
    res.attachment(`backup-simeaobuddy-${new Date().toLocaleDateString('sv-SE')}.json`);
    res.type('application/json').send(JSON.stringify(backup));
  });

  // Corpo: { confirmar: 'RESTAURAR', backup: {...} }
  r.post('/restaurar', exigirAdmin, (req, res) => {
    if (req.body?.confirmar !== 'RESTAURAR') return res.status(400).json({ erro: 'Digite RESTAURAR para confirmar.' });
    const erro = validarBackup(db, req.body.backup);
    if (erro) return res.status(400).json({ erro });
    let copia;
    try {
      copia = copiaDeSeguranca(db, pastaBackups);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ erro: 'Não deu para salvar a cópia de segurança do banco atual. Nada foi mudado.' });
    }
    try {
      const contagem = restaurarBackup(db, req.body.backup, { manterSessaoDe: req.usuario.id });
      console.log(`Backup restaurado. Cópia do banco anterior: ${copia}`);
      res.json({ ok: true, copia, contagem });
    } catch (e) {
      if (!e.amigavel) throw e;
      res.status(400).json({ erro: e.message, copia });
    }
  });

  return r;
}
