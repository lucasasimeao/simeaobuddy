// Monta o app Express (separado do server.js para os testes usarem).
import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarUsuario } from './auth/permissoes.js';
import { rotasSaude } from './routes/saude.js';
import { rotasAuth } from './routes/auth.js';
import { rotasAlunos } from './routes/alunos.js';
import { rotasExercicios } from './routes/exercicios.js';
import { rotasProgramas } from './routes/programas.js';
import { rotasTreinos } from './routes/treinos.js';

const PUBLICO = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const REGRAS = join(dirname(fileURLToPath(import.meta.url)), 'treino');

// opcoes.trocarCodigo: troca o código do Google (os testes passam um falso)
export function criarApp(db, opcoes = {}) {
  const app = express();
  app.set('trust proxy', 'loopback'); // o Tailscale Funnel chega pelo localhost
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use(carregarUsuario(db));

  app.use('/api/saude', rotasSaude(db));
  app.use('/api/auth', rotasAuth(db, opcoes));
  app.use('/api/alunos', rotasAlunos(db));
  app.use('/api/exercicios', rotasExercicios(db));
  app.use('/api/programas', rotasProgramas(db));
  app.use('/api/treinos', rotasTreinos(db));

  // Rota de API que não existe → erro em JSON
  app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

  app.use(express.static(PUBLICO));
  // As regras de treino (funções puras) também rodam no navegador: a mesma fonte, sem copiar código
  app.use('/js/treino', express.static(REGRAS));

  // Erro inesperado → mensagem amigável
  app.use((erro, req, res, next) => {
    if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'Dados enviados em formato inválido.' });
    console.error(erro);
    res.status(500).json({ erro: 'Algo deu errado no servidor. Tente de novo.' });
  });

  return app;
}
