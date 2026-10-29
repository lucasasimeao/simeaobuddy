// Monta o app Express (separado do server.js para os testes usarem).
import express from 'express';
import { join, dirname, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarUsuario } from './auth/permissoes.js';
import { rotasSaude } from './routes/saude.js';
import { rotasAuth } from './routes/auth.js';
import { rotasAlunos } from './routes/alunos.js';
import { rotasExercicios } from './routes/exercicios.js';
import { rotasProgramas } from './routes/programas.js';
import { rotasTreinos } from './routes/treinos.js';
import { rotasCheckins } from './routes/checkins.js';
import { rotasCorpo } from './routes/corpo.js';
import { rotasEvolucao } from './routes/evolucao.js';
import { rotasExportar } from './routes/exportar.js';
import { rotasBackup } from './routes/backup.js';
import { CAMINHO_PADRAO } from './db/conexao.js';
import { montarServiceWorker } from './pwa/service-worker.js';

const PUBLICO = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const REGRAS = join(dirname(fileURLToPath(import.meta.url)), 'treino');
const CHART = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'chart.js', 'dist');
// App Android (TWA): o celular confere este arquivo para abrir o app sem a barra de endereço
const ASSETLINKS = join(dirname(fileURLToPath(import.meta.url)), '..', 'android', 'assetlinks.json');

// Fotos ao lado do banco, uma pasta por banco: data/fotos/treino/ (real) e data/fotos/exemplo/ (exemplo)
function pastaDeFotos() {
  const banco = resolve(process.env.DB_PATH || CAMINHO_PADRAO);
  return join(dirname(banco), 'fotos', basename(banco, extname(banco)));
}

// Cópias automáticas antes de restaurar um backup: data/backups/
function pastaDeBackups() {
  return join(dirname(resolve(process.env.DB_PATH || CAMINHO_PADRAO)), 'backups');
}

// Cabeçalhos de segurança: o navegador só roda código e carrega arquivos do próprio app
// (+ fonte do Google e foto do perfil Google), e outro site não consegue abrir o app dentro de um quadro.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

function cabecalhosDeSeguranca(req, res, next) {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  });
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store'); // dados pessoais não ficam no cache do navegador
  next();
}

// opcoes.trocarCodigo: troca o código do Google (os testes passam um falso)
export function criarApp(db, opcoes = {}) {
  const app = express();
  app.set('trust proxy', 'loopback'); // o Tailscale Funnel chega pelo localhost
  app.disable('x-powered-by');
  app.use(cabecalhosDeSeguranca);
  app.use('/api/backup/restaurar', express.json({ limit: '50mb' })); // o arquivo de backup pode ser grande
  app.use(express.json({ limit: '2mb' }));
  app.use(carregarUsuario(db));

  app.use('/api/saude', rotasSaude(db));
  app.use('/api/auth', rotasAuth(db, opcoes));
  app.use('/api/alunos', rotasAlunos(db));
  app.use('/api/exercicios', rotasExercicios(db));
  app.use('/api/programas', rotasProgramas(db));
  app.use('/api/treinos', rotasTreinos(db));
  app.use('/api/checkins', rotasCheckins(db));
  app.use('/api/corpo', rotasCorpo(db, { pastaFotos: opcoes.pastaFotos || pastaDeFotos() }));
  app.use('/api/evolucao', rotasEvolucao(db));
  app.use('/api/exportar', rotasExportar(db));
  app.use('/api/backup', rotasBackup(db, { pastaBackups: opcoes.pastaBackups || pastaDeBackups() }));

  // Rota de API que não existe → erro em JSON
  app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

  // Service worker (PWA): montado na hora com a lista de arquivos e a versão; nunca fica em cache
  app.get('/sw.js', (req, res) => {
    const { codigo } = montarServiceWorker({ publico: PUBLICO, regras: REGRAS, chart: join(CHART, 'chart.umd.js') });
    res.set({ 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' }).send(codigo);
  });

  app.get('/.well-known/assetlinks.json', (req, res) => res.type('application/json').sendFile(ASSETLINKS));

  app.use(express.static(PUBLICO));
  // As regras de treino (funções puras) também rodam no navegador: a mesma fonte, sem copiar código
  app.use('/js/treino', express.static(REGRAS));
  // Chart.js (gráficos da Evolução) direto do node_modules, sem copiar
  app.use('/vendor', express.static(CHART));

  // Erro inesperado → mensagem amigável
  app.use((erro, req, res, next) => {
    if (erro.type === 'entity.too.large') return res.status(413).json({ erro: 'Arquivo grande demais.' });
    if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'Dados enviados em formato inválido.' });
    console.error(erro);
    res.status(500).json({ erro: 'Algo deu errado no servidor. Tente de novo.' });
  });

  return app;
}
