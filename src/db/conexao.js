// Conexão com o banco (node:sqlite, nativo do Node 24).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { aplicarMigracoes } from './migracoes.js';
import { semearBiblioteca } from './biblioteca.js';
import { semearModelo } from './programas.js';

export const CAMINHO_PADRAO = 'data/treino.db';

// Abre o banco e aplica as migrações pendentes.
// caminho ':memory:' serve para os testes.
export function abrirBanco(caminho = process.env.DB_PATH || CAMINHO_PADRAO) {
  if (caminho !== ':memory:') mkdirSync(dirname(resolve(caminho)), { recursive: true });
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA foreign_keys = ON;');
  if (caminho !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  aplicarMigracoes(db);
  // Dados de referência: só entram quando ainda não existem
  semearBiblioteca(db);
  semearModelo(db);
  return db;
}
