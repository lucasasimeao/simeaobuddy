// Monta o app Express (separado do server.js para os testes usarem).
import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rotasSaude } from './routes/saude.js';

const PUBLICO = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

export function criarApp(db) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.use('/api/saude', rotasSaude(db));

  // Rota de API que não existe → erro em JSON
  app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

  app.use(express.static(PUBLICO));

  // Erro inesperado → mensagem amigável
  app.use((erro, req, res, next) => {
    console.error(erro);
    res.status(500).json({ erro: 'Algo deu errado no servidor. Tente de novo.' });
  });

  return app;
}
