// Migrações numeradas em src/db/migracoes/NNN_nome.sql.
// Regra: só aditivas (criar tabela/coluna). Nunca apagar nem renomear.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PASTA = join(dirname(fileURLToPath(import.meta.url)), 'migracoes');

export function listarArquivos(pasta = PASTA) {
  return readdirSync(pasta)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort();
}

// Aplica as que faltam, cada uma numa transação. Devolve os nomes aplicados agora.
export function aplicarMigracoes(db, pasta = PASTA) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migracoes (
    nome TEXT PRIMARY KEY,
    aplicada_em TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const feitas = new Set(db.prepare('SELECT nome FROM _migracoes').all().map((r) => r.nome));
  const aplicadas = [];
  for (const arquivo of listarArquivos(pasta)) {
    if (feitas.has(arquivo)) continue;
    const sql = readFileSync(join(pasta, arquivo), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO _migracoes (nome) VALUES (?)').run(arquivo);
      db.exec('COMMIT');
      aplicadas.push(arquivo);
    } catch (erro) {
      db.exec('ROLLBACK');
      throw new Error(`Falha na migração ${arquivo}: ${erro.message}`);
    }
  }
  return aplicadas;
}
