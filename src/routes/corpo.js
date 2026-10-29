// Corpo: peso diário, medidas e fotos. Cada um registra o seu; o admin também vê os dos alunos (?aluno_id=).
// Fotos ficam em arquivo (pasta de fotos ao lado do banco) e só saem por esta rota, para o dono ou o admin.
import { Router } from 'express';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { exigirLogin } from '../auth/permissoes.js';
import { hojeLocal } from '../db/treinos.js';
import { avaliarPeso, MEDIDAS } from '../treino/corpo.js';
import { validarPeso, validarMedidas, validarDataCorpo } from '../validacao.js';

const TIPOS_FOTO = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_FOTO = 1.5 * 1024 * 1024;

// Confere a assinatura do arquivo (não confia só no que o celular diz)
function tipoReal(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

// O aluno vê só a si mesmo; o admin pode pedir ?aluno_id= de qualquer um
export function alunoAlvo(req, res) {
  const pedido = Number(req.query.aluno_id) || req.usuario.id;
  if (pedido !== req.usuario.id && req.usuario.papel !== 'admin') {
    res.status(403).json({ erro: 'Você só pode ver os seus próprios dados.' });
    return null;
  }
  return pedido;
}

export function dadosDoCorpo(db, alunoId) {
  const pesos = db.prepare('SELECT data, peso FROM pesos WHERE aluno_id = ? ORDER BY data').all(alunoId);
  const medidas = db.prepare('SELECT * FROM medidas WHERE aluno_id = ? ORDER BY data').all(alunoId);
  const objetivo = db.prepare('SELECT objetivo FROM alunos WHERE usuario_id = ?').get(alunoId)?.objetivo || null;
  return { pesos, medidas, objetivo, avaliacao: avaliarPeso(pesos, objetivo, hojeLocal()) };
}

export function rotasCorpo(db, opcoes = {}) {
  const r = Router();
  const pasta = opcoes.pastaFotos;

  r.get('/', exigirLogin, (req, res) => {
    const alunoId = alunoAlvo(req, res);
    if (!alunoId) return;
    const fotos = db.prepare('SELECT id, data FROM fotos WHERE aluno_id = ? ORDER BY data DESC, id DESC').all(alunoId);
    res.json({ ...dadosDoCorpo(db, alunoId), fotos, campos_medidas: MEDIDAS, hoje: hojeLocal() });
  });

  // Peso do dia (registrar de novo no mesmo dia corrige)
  r.put('/peso', exigirLogin, (req, res) => {
    const { dados, erro } = validarPeso(req.body, hojeLocal());
    if (erro) return res.status(400).json({ erro });
    db.prepare(`INSERT INTO pesos (aluno_id, data, peso) VALUES (?, ?, ?)
      ON CONFLICT (aluno_id, data) DO UPDATE SET peso = excluded.peso`).run(req.usuario.id, dados.data, dados.peso);
    res.json({ ok: true, ...dados });
  });

  r.delete('/peso/:data', exigirLogin, (req, res) => {
    db.prepare('DELETE FROM pesos WHERE aluno_id = ? AND data = ?').run(req.usuario.id, String(req.params.data));
    res.json({ ok: true });
  });

  // Medidas de um dia (registrar de novo no mesmo dia corrige)
  r.put('/medidas', exigirLogin, (req, res) => {
    const { dados, erro } = validarMedidas(req.body, MEDIDAS, hojeLocal());
    if (erro) return res.status(400).json({ erro });
    const campos = [...MEDIDAS.map((c) => c.campo), 'observacao'];
    db.prepare(`INSERT INTO medidas (aluno_id, data, ${campos.join(', ')}) VALUES (?, ?, ${campos.map(() => '?').join(', ')})
      ON CONFLICT (aluno_id, data) DO UPDATE SET ${campos.map((c) => `${c} = excluded.${c}`).join(', ')}`)
      .run(req.usuario.id, dados.data, ...campos.map((c) => dados[c]));
    res.json({ ok: true });
  });

  r.delete('/medidas/:id', exigirLogin, (req, res) => {
    db.prepare('DELETE FROM medidas WHERE id = ? AND aluno_id = ?').run(Number(req.params.id), req.usuario.id);
    res.json({ ok: true });
  });

  // Foto: { data?, imagem: "data:image/jpeg;base64,..." } (o celular já reduz antes de mandar)
  r.post('/fotos', exigirLogin, (req, res) => {
    const data = validarDataCorpo(req.body?.data, hojeLocal());
    if (data.erro) return res.status(400).json({ erro: data.erro });
    const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.imagem || ''));
    if (!m || !TIPOS_FOTO[m[1]]) return res.status(400).json({ erro: 'Envie uma foto JPG, PNG ou WebP.' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_FOTO) return res.status(400).json({ erro: 'Foto grande demais (máximo 1,5 MB).' });
    const tipo = tipoReal(buf);
    if (!tipo) return res.status(400).json({ erro: 'O arquivo não é uma imagem válida.' });
    const dir = join(pasta, String(req.usuario.id));
    mkdirSync(dir, { recursive: true });
    const arquivo = `${randomUUID()}.${TIPOS_FOTO[tipo]}`;
    writeFileSync(join(dir, arquivo), buf);
    const { lastInsertRowid } = db.prepare('INSERT INTO fotos (aluno_id, data, arquivo) VALUES (?, ?, ?)').run(req.usuario.id, data.valor, arquivo);
    res.status(201).json({ id: Number(lastInsertRowid), data: data.valor });
  });

  r.get('/fotos/:id', exigirLogin, (req, res) => {
    const f = db.prepare('SELECT * FROM fotos WHERE id = ?').get(Number(req.params.id));
    if (!f || (f.aluno_id !== req.usuario.id && req.usuario.papel !== 'admin')) return res.status(404).json({ erro: 'Foto não encontrada.' });
    const caminho = join(pasta, String(f.aluno_id), f.arquivo);
    if (!existsSync(caminho)) return res.status(404).json({ erro: 'Foto não encontrada.' });
    res.sendFile(caminho); // sem cache (no-store, como toda a /api): a foto não fica no celular depois de sair da conta
  });

  r.delete('/fotos/:id', exigirLogin, (req, res) => {
    const f = db.prepare('SELECT * FROM fotos WHERE id = ? AND aluno_id = ?').get(Number(req.params.id), req.usuario.id);
    if (!f) return res.status(404).json({ erro: 'Foto não encontrada.' });
    rmSync(join(pasta, String(f.aluno_id), f.arquivo), { force: true });
    db.prepare('DELETE FROM fotos WHERE id = ?').run(f.id);
    res.json({ ok: true });
  });

  return r;
}
