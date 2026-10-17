// Middlewares de permissão. Toda rota de dados passa por aqui.
import { usuarioDaSessao } from './sessoes.js';

// Coloca req.usuario (ou null) em toda requisição
export function carregarUsuario(db) {
  return (req, res, next) => {
    req.usuario = usuarioDaSessao(db, req);
    next();
  };
}

export function exigirLogin(req, res, next) {
  if (!req.usuario) return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  if (req.usuario.status === 'pendente') return res.status(403).json({ erro: 'Seu cadastro está aguardando a aprovação do Lucas.', pendente: true });
  if (req.usuario.status !== 'ativo') return res.status(403).json({ erro: 'Sua conta está desativada. Fale com o Lucas.' });
  next();
}

export function exigirAdmin(req, res, next) {
  exigirLogin(req, res, () => {
    if (req.usuario.papel !== 'admin') return res.status(403).json({ erro: 'Só o treinador pode fazer isso.' });
    next();
  });
}

// O admin vê todos; o aluno só a si mesmo (id vem de req.params.id)
export function podeVerAluno(req, res, next) {
  exigirLogin(req, res, () => {
    const id = Number(req.params.id);
    if (req.usuario.papel === 'admin' || req.usuario.id === id) return next();
    res.status(403).json({ erro: 'Você só pode ver os seus próprios dados.' });
  });
}
