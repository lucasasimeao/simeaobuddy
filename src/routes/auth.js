// Login: admin com usuário+senha; alunos com Google (cadastro fica pendente até o admin aprovar).
import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { conferirSenha, gerarHash, senhaValida } from '../auth/senha.js';
import { criarSessao, encerrarSessao, encerrarTodas, lerCookies, ehHttps, opcoesCookie } from '../auth/sessoes.js';
import { exigirAdmin } from '../auth/permissoes.js';
import * as google from '../auth/google.js';

export const MAX_TENTATIVAS = 5;
export const MINUTOS_BLOQUEIO = 15;
const HASH_FALSO = gerarHash('senha-que-ninguem-usa'); // iguala o tempo de resposta quando o usuário não existe

// Limite por IP (memória): 20 tentativas a cada 15 min
const porIp = new Map();
function ipEstourou(ip) {
  const agora = Date.now();
  const lista = (porIp.get(ip) || []).filter((t) => agora - t < 15 * 60 * 1000);
  lista.push(agora);
  porIp.set(ip, lista);
  return lista.length > 20;
}

const publico = (u) => ({ id: u.id, nome: u.nome, papel: u.papel, status: u.status, email: u.email, foto_url: u.foto_url });

export function rotasAuth(db, opcoes = {}) {
  const trocarCodigo = opcoes.trocarCodigo || google.trocarCodigo;
  const r = Router();

  r.get('/config', (req, res) => res.json({ google: google.googleConfigurado() || Boolean(opcoes.trocarCodigo) }));

  r.get('/eu', (req, res) => {
    if (!req.usuario) return res.status(401).json({ erro: 'Não está logado.' });
    res.json({ usuario: publico(req.usuario) });
  });

  r.post('/entrar', (req, res) => {
    const usuario = String(req.body?.usuario || '').trim().toLowerCase();
    const senha = String(req.body?.senha || '');
    if (!usuario || !senha) return res.status(400).json({ erro: 'Preencha o usuário e a senha.' });
    if (ipEstourou(req.ip)) return res.status(429).json({ erro: 'Muitas tentativas. Espere alguns minutos.' });

    const u = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario);
    if (!u) {
      conferirSenha(senha, HASH_FALSO);
      return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
    }
    const bloqueado = db.prepare("SELECT bloqueado_ate > datetime('now') AS sim FROM usuarios WHERE id = ?").get(u.id).sim;
    if (bloqueado) {
      return res.status(429).json({ erro: `Muitas tentativas erradas. Tente de novo em ${MINUTOS_BLOQUEIO} minutos.` });
    }
    if (!conferirSenha(senha, u.senha_hash)) {
      const falhas = u.tentativas_falhas + 1;
      if (falhas >= MAX_TENTATIVAS) {
        db.prepare("UPDATE usuarios SET tentativas_falhas = 0, bloqueado_ate = datetime('now', ?) WHERE id = ?").run(`+${MINUTOS_BLOQUEIO} minutes`, u.id);
        return res.status(429).json({ erro: `Muitas tentativas erradas. Tente de novo em ${MINUTOS_BLOQUEIO} minutos.` });
      }
      db.prepare('UPDATE usuarios SET tentativas_falhas = ? WHERE id = ?').run(falhas, u.id);
      return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
    }
    if (u.status !== 'ativo') return res.status(403).json({ erro: 'Esta conta está desativada.' });
    db.prepare('UPDATE usuarios SET tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = ?').run(u.id);
    criarSessao(db, req, res, u.id);
    res.json({ usuario: publico(u) });
  });

  r.post('/sair', (req, res) => {
    encerrarSessao(db, req, res);
    res.json({ ok: true });
  });

  // Admin troca a própria senha (derruba as outras sessões)
  r.put('/senha', exigirAdmin, (req, res) => {
    const { atual, nova } = req.body || {};
    const u = db.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(req.usuario.id);
    if (!conferirSenha(String(atual || ''), u.senha_hash)) return res.status(400).json({ erro: 'A senha atual está errada.' });
    if (!senhaValida(nova)) return res.status(400).json({ erro: 'A senha nova precisa ter pelo menos 8 caracteres.' });
    db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(gerarHash(nova), req.usuario.id);
    encerrarTodas(db, req.usuario.id);
    criarSessao(db, req, res, req.usuario.id);
    res.json({ ok: true });
  });

  // --- Google ---
  const redirectUri = (req) => `${ehHttps(req) ? 'https' : 'http'}://${req.headers.host}/api/auth/google/retorno`;
  const voltarComErro = (res, codigo) => res.redirect(`/#/login?erro=${codigo}`);

  r.get('/google', (req, res) => {
    if (!google.googleConfigurado()) return voltarComErro(res, 'google-desligado');
    // O Google só aceita https ou localhost (o IP da Wi-Fi é recusado)
    const host = String(req.headers.host || '').split(':')[0];
    if (!ehHttps(req) && host !== 'localhost') return voltarComErro(res, 'precisa-https');
    const estado = randomBytes(16).toString('hex');
    res.cookie('oauth_estado', estado, opcoesCookie(req, 600));
    res.redirect(google.urlDeLogin({ redirectUri: redirectUri(req), estado }));
  });

  r.get('/google/retorno', async (req, res) => {
    const estado = lerCookies(req).oauth_estado;
    res.clearCookie('oauth_estado', { path: '/' });
    if (req.query.error) return voltarComErro(res, 'google-cancelado');
    if (!estado || estado !== req.query.state || !req.query.code) return voltarComErro(res, 'google-falhou');

    let perfil;
    try {
      perfil = await trocarCodigo({ codigo: String(req.query.code), redirectUri: redirectUri(req) });
    } catch (erro) {
      console.error('Login Google:', erro.message);
      return voltarComErro(res, 'google-falhou');
    }

    let u = db.prepare('SELECT * FROM usuarios WHERE google_id = ?').get(perfil.googleId);
    if (!u) {
      const { lastInsertRowid: id } = db.prepare(
        "INSERT INTO usuarios (nome, papel, status, google_id, email, foto_url) VALUES (?, 'aluno', 'pendente', ?, ?, ?)",
      ).run(perfil.nome.slice(0, 60), perfil.googleId, perfil.email, perfil.foto);
      db.prepare('INSERT INTO alunos (usuario_id) VALUES (?)').run(id);
      u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
    } else {
      db.prepare('UPDATE usuarios SET email = ?, foto_url = ? WHERE id = ?').run(perfil.email, perfil.foto, u.id);
    }
    if (u.status === 'inativo') return voltarComErro(res, 'inativo');
    criarSessao(db, req, res, u.id);
    res.redirect('/#/hoje');
  });

  return r;
}
