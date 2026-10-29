// Exportar (admin): a planilha do programa em .xlsx, no layout da "PLANILHA AVANÇADO".
import { Router } from 'express';
import { exigirAdmin } from '../auth/permissoes.js';
import { gerarPlanilhaXlsx } from '../exportar/planilha-xlsx.js';

export function rotasExportar(db) {
  const r = Router();

  r.get('/planilha/:programaId', exigirAdmin, async (req, res, next) => {
    try {
      const arquivo = await gerarPlanilhaXlsx(db, Number(req.params.programaId));
      if (!arquivo) return res.status(404).json({ erro: 'Programa não encontrado.' });
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment(arquivo.nome);
      res.send(arquivo.buffer);
    } catch (erro) {
      next(erro);
    }
  });

  return r;
}
