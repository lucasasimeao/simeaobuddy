// Treinos na academia: começar, registrar séries, trocar exercício, finalizar. Cada um só mexe nos próprios.
import { Router } from 'express';
import { exigirLogin, exigirAdmin } from '../auth/permissoes.js';
import { montarFicha, resumoTreino, resumoHoje, finalizadosDoPrograma, hojeLocal } from '../db/treinos.js';
import { proximoTreino, microcicloParaSessao, semanaDaEscada } from '../treino/sequencia.js';
import { validarSerie } from '../validacao.js';

export function rotasTreinos(db) {
  const r = Router();
  const buscar = (id) => db.prepare('SELECT * FROM treinos_realizados WHERE id = ?').get(id);

  // Leitura: dono ou admin. Escrita: só o dono.
  function carregar(req, res, escrita) {
    const t = buscar(Number(req.params.id));
    const dono = t && t.aluno_id === req.usuario.id;
    if (!t || (!dono && (escrita || req.usuario.papel !== 'admin'))) {
      res.status(404).json({ erro: 'Treino não encontrado.' });
      return null;
    }
    if (escrita && t.status === 'descartado') {
      res.status(400).json({ erro: 'Este treino foi descartado.' });
      return null;
    }
    return t;
  }

  r.get('/hoje', exigirLogin, (req, res) => res.json(resumoHoje(db, req.usuario.id)));

  // Começar um treino (sem sessao_id = o próximo da sequência). Se já tem um em andamento, devolve ele.
  r.post('/', exigirLogin, (req, res) => {
    const aberto = db.prepare("SELECT id FROM treinos_realizados WHERE aluno_id = ? AND status = 'em_andamento'").get(req.usuario.id);
    if (aberto) return res.json({ ...montarFicha(db, aberto.id), ja_existia: true });

    const p = db.prepare("SELECT id, n_microciclos FROM programas WHERE aluno_id = ? AND status = 'ativo'").get(req.usuario.id);
    if (!p) return res.status(400).json({ erro: 'Você ainda não tem um programa ativo.' });
    const sessoes = db.prepare('SELECT id FROM sessoes_modelo WHERE programa_id = ? ORDER BY ordem, id').all(p.id);
    const finalizados = finalizadosDoPrograma(db, p.id);
    const prox = proximoTreino(sessoes, finalizados);
    if (!prox) return res.status(400).json({ erro: 'O programa ainda não tem treinos.' });

    let sessaoId = prox.sessao_id;
    let micro = prox.microciclo;
    if (req.body?.sessao_id && Number(req.body.sessao_id) !== prox.sessao_id) {
      sessaoId = Number(req.body.sessao_id);
      if (!sessoes.some((s) => s.id === sessaoId)) return res.status(400).json({ erro: 'Esse treino não é do seu programa.' });
      micro = microcicloParaSessao(sessaoId, finalizados);
    }
    const { lastInsertRowid } = db.prepare(`INSERT INTO treinos_realizados (aluno_id, programa_id, sessao_id, microciclo, semana_escada, data)
      VALUES (?, ?, ?, ?, ?, ?)`).run(req.usuario.id, p.id, sessaoId, micro, semanaDaEscada(micro, p.n_microciclos), hojeLocal());
    res.status(201).json(montarFicha(db, Number(lastInsertRowid)));
  });

  // Dados para a tela Planilha (admin): séries de todos os treinos de um programa
  r.get('/planilha/:programaId', exigirAdmin, (req, res) => {
    const treinos = db.prepare(`SELECT id, sessao_id, microciclo, semana_escada, data, status, observacao FROM treinos_realizados
      WHERE programa_id = ? AND status <> 'descartado' ORDER BY microciclo, id`).all(Number(req.params.programaId));
    const series = treinos.length
      ? db.prepare(`SELECT s.treino_id, s.item_id, s.exercicio_id, s.posicao, s.bloco, s.tipo, s.carga, s.reps, s.rir
          FROM series_realizadas s WHERE s.treino_id IN (${treinos.map(() => '?').join(',')}) ORDER BY s.posicao, s.bloco`).all(...treinos.map((t) => t.id))
      : [];
    res.json({ treinos: treinos.map((t) => ({ ...t, series: series.filter((s) => s.treino_id === t.id) })) });
  });

  r.get('/:id', exigirLogin, (req, res) => {
    if (!carregar(req, res, false)) return;
    res.json(montarFicha(db, Number(req.params.id)));
  });

  // Registrar (ou corrigir) uma série. Chave: item + posição + bloco. O uuid evita duplicar quando o celular reenvia.
  r.put('/:id/series', exigirLogin, (req, res) => {
    const t = carregar(req, res, true);
    if (!t) return;
    const ficha = montarFicha(db, t.id);
    const item = ficha.itens.find((i) => i.id === Number(req.body?.item_id));
    if (!item) return res.status(400).json({ erro: 'Exercício não faz parte deste treino.' });
    const { dados, erro } = validarSerie(req.body, item);
    if (erro) return res.status(400).json({ erro });

    db.prepare(`INSERT INTO series_realizadas (uuid, treino_id, item_id, exercicio_id, posicao, bloco, tipo, carga, reps, rir)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (treino_id, item_id, posicao, bloco) DO UPDATE SET exercicio_id = excluded.exercicio_id, tipo = excluded.tipo,
        carga = excluded.carga, reps = excluded.reps, rir = excluded.rir, atualizado_em = datetime('now')`)
      .run(dados.uuid, t.id, item.id, item.exercicio.id, dados.posicao, dados.bloco, dados.tipo, dados.carga, dados.reps, dados.rir);
    const serie = db.prepare('SELECT * FROM series_realizadas WHERE treino_id = ? AND item_id = ? AND posicao = ? AND bloco = ?')
      .get(t.id, item.id, dados.posicao, dados.bloco);
    res.json({ serie });
  });

  // Apagar uma série registrada (?item_id=&posicao=&bloco=)
  r.delete('/:id/series', exigirLogin, (req, res) => {
    const t = carregar(req, res, true);
    if (!t) return;
    db.prepare('DELETE FROM series_realizadas WHERE treino_id = ? AND item_id = ? AND posicao = ? AND bloco = ?')
      .run(t.id, Number(req.query.item_id), Number(req.query.posicao), Number(req.query.bloco || 0));
    res.json({ ok: true });
  });

  // Trocar o exercício deste treino por um substituto (ou outro da biblioteca). exercicio_id vazio = voltar ao original.
  r.post('/:id/trocar', exigirLogin, (req, res) => {
    const t = carregar(req, res, true);
    if (!t) return;
    const itemId = Number(req.body?.item_id);
    const item = db.prepare('SELECT i.id, i.exercicio_id FROM itens_sessao i WHERE i.id = ? AND i.sessao_id = ?').get(itemId, t.sessao_id);
    if (!item) return res.status(400).json({ erro: 'Exercício não faz parte deste treino.' });
    const novo = Number(req.body?.exercicio_id) || null;
    if (db.prepare('SELECT 1 FROM series_realizadas WHERE treino_id = ? AND item_id = ? LIMIT 1').get(t.id, itemId)) {
      return res.status(400).json({ erro: 'Já tem série registrada neste exercício. Apague as séries antes de trocar.' });
    }
    if (!novo || novo === item.exercicio_id) {
      db.prepare('DELETE FROM trocas_treino WHERE treino_id = ? AND item_id = ?').run(t.id, itemId);
    } else {
      if (!db.prepare('SELECT 1 FROM exercicios WHERE id = ? AND ativo = 1').get(novo)) return res.status(400).json({ erro: 'Exercício inválido.' });
      db.prepare('INSERT INTO trocas_treino (treino_id, item_id, exercicio_id) VALUES (?, ?, ?) ON CONFLICT (treino_id, item_id) DO UPDATE SET exercicio_id = excluded.exercicio_id')
        .run(t.id, itemId, novo);
    }
    res.json(montarFicha(db, t.id));
  });

  r.post('/:id/finalizar', exigirLogin, (req, res) => {
    const t = carregar(req, res, true);
    if (!t) return;
    const obs = req.body?.observacao == null ? t.observacao : String(req.body.observacao).trim().slice(0, 1000) || null;
    db.prepare(`UPDATE treinos_realizados SET status = 'finalizado', observacao = ?, fim = coalesce(fim, datetime('now')) WHERE id = ?`).run(obs, t.id);
    const ficha = montarFicha(db, t.id);
    res.json({ ...ficha, resumo: resumoTreino(ficha) });
  });

  r.get('/:id/resumo', exigirLogin, (req, res) => {
    if (!carregar(req, res, false)) return;
    const ficha = montarFicha(db, Number(req.params.id));
    res.json({ ...ficha, resumo: resumoTreino(ficha) });
  });

  // Descartar um treino começado por engano (as séries ficam guardadas, mas não contam)
  r.post('/:id/descartar', exigirLogin, (req, res) => {
    const t = carregar(req, res, true);
    if (!t) return;
    if (t.status !== 'em_andamento') return res.status(400).json({ erro: 'Só dá para descartar um treino em andamento.' });
    db.prepare("UPDATE treinos_realizados SET status = 'descartado', fim = datetime('now') WHERE id = ?").run(t.id);
    res.json({ ok: true });
  });

  return r;
}
