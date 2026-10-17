// Sessões por cookie httpOnly. O banco guarda só o sha256 do token.
import { randomBytes, createHash } from 'node:crypto';

export const COOKIE = 'sessao';
export const DIAS = 90;

const sha256 = (t) => createHash('sha256').update(t).digest('hex');

export function lerCookies(req) {
  const saida = {};
  for (const parte of String(req.headers.cookie || '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0) saida[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
  }
  return saida;
}

// https quando vem pelo Tailscale (ou outro proxy https)
export function ehHttps(req) {
  return req.headers['x-forwarded-proto'] === 'https' || String(req.headers.host || '').endsWith('.ts.net');
}

export function opcoesCookie(req, maxAgeSeg) {
  return { httpOnly: true, sameSite: 'lax', secure: ehHttps(req), path: '/', maxAge: maxAgeSeg * 1000 };
}

export function criarSessao(db, req, res, usuarioId) {
  const token = randomBytes(32).toString('base64url');
  db.prepare("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, datetime('now', ?))")
    .run(sha256(token), usuarioId, `+${DIAS} days`);
  db.prepare("UPDATE usuarios SET ultimo_acesso = datetime('now') WHERE id = ?").run(usuarioId);
  res.cookie(COOKIE, token, opcoesCookie(req, DIAS * 86400));
  return token;
}

export function usuarioDaSessao(db, req) {
  const token = lerCookies(req)[COOKIE];
  if (!token) return null;
  return db.prepare(`
    SELECT u.id, u.nome, u.papel, u.status, u.email, u.foto_url, u.usuario
    FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token_hash = ? AND s.expira_em > datetime('now')`).get(sha256(token)) || null;
}

export function encerrarSessao(db, req, res) {
  const token = lerCookies(req)[COOKIE];
  if (token) db.prepare('DELETE FROM sessoes WHERE token_hash = ?').run(sha256(token));
  res.clearCookie(COOKIE, { path: '/' });
}

export function encerrarTodas(db, usuarioId) {
  db.prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(usuarioId);
}
