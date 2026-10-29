// Backup e restauração em JSON: todas as tabelas do banco (menos as sessões de login).
// Restaurar troca tudo de uma vez, numa transação só. Antes, uma cópia do banco atual vai para data/backups/.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const FORMATO = 1;
const FORA = new Set(['sessoes', '_migracoes']); // login e controle de migrações não entram

// Tabelas na ordem pai → filho (as que surgirem em migrações novas entram no fim)
const ORDEM = ['config', 'usuarios', 'alunos', 'exercicios', 'programas', 'sessoes_modelo', 'itens_sessao', 'itens_semana',
  'treinos_realizados', 'series_realizadas', 'trocas_treino', 'checkins', 'pesos', 'medidas', 'fotos'];

export function tabelasDoBanco(db) {
  const nomes = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all()
    .map((t) => t.name).filter((n) => !FORA.has(n));
  return [...ORDEM.filter((n) => nomes.includes(n)), ...nomes.filter((n) => !ORDEM.includes(n)).sort()];
}

const colunas = (db, tabela) => db.prepare(`PRAGMA table_info("${tabela}")`).all().map((c) => c.name);

export function gerarBackup(db) {
  const tabelas = {};
  for (const t of tabelasDoBanco(db)) tabelas[t] = db.prepare(`SELECT * FROM "${t}"`).all();
  return {
    app: 'SIMEAOBuddy',
    formato: FORMATO,
    gerado_em: new Date().toISOString(),
    migracoes: db.prepare('SELECT nome FROM _migracoes ORDER BY nome').all().map((m) => m.nome),
    tabelas,
  };
}

// Confere o arquivo antes de mexer no banco. Devolve a mensagem de erro (ou null).
export function validarBackup(db, backup) {
  if (!backup || typeof backup !== 'object' || backup.app !== 'SIMEAOBuddy' || !backup.tabelas || typeof backup.tabelas !== 'object') {
    return 'Este arquivo não é um backup do SIMEAOBuddy.';
  }
  if (backup.formato !== FORMATO) return 'Este backup é de outra versão do app.';
  const existentes = tabelasDoBanco(db);
  const desconhecidas = Object.keys(backup.tabelas).filter((t) => !existentes.includes(t));
  if (desconhecidas.length) return `O backup tem dados que esta versão do app não conhece (${desconhecidas.join(', ')}). Atualize o app primeiro.`;
  for (const [t, linhas] of Object.entries(backup.tabelas)) {
    if (!Array.isArray(linhas) || linhas.some((l) => !l || typeof l !== 'object' || Array.isArray(l))) return `A tabela "${t}" do backup está com defeito.`;
  }
  const usuarios = backup.tabelas.usuarios || [];
  if (!usuarios.some((u) => u.papel === 'admin')) return 'O backup não tem o admin: restaurar deixaria o app sem ninguém para entrar.';
  return null;
}

// Cópia do banco atual (VACUUM INTO) antes de restaurar. Devolve o caminho do arquivo.
export function copiaDeSeguranca(db, pasta) {
  mkdirSync(pasta, { recursive: true });
  const carimbo = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const arquivo = join(pasta, `antes-de-restaurar-${carimbo}.db`);
  db.prepare('VACUUM INTO ?').run(arquivo);
  return arquivo;
}

// Troca o conteúdo de todas as tabelas pelo do backup. manterSessaoDe: id do admin que está restaurando
// (a sessão dele continua valendo se ele ainda for o admin no backup; as outras saem).
export function restaurarBackup(db, backup, { manterSessaoDe = null } = {}) {
  const erro = validarBackup(db, backup);
  if (erro) throw Object.assign(new Error(erro), { amigavel: true });
  const tabelas = tabelasDoBanco(db);
  const contagem = {};
  db.exec('PRAGMA foreign_keys = OFF'); // não muda dentro de transação: desliga antes e confere tudo no fim
  db.exec('BEGIN');
  try {
    for (const t of [...tabelas].reverse()) db.exec(`DELETE FROM "${t}"`);
    for (const t of tabelas) {
      const linhas = backup.tabelas[t] || [];
      const cols = colunas(db, t);
      for (const linha of linhas) {
        // Só as colunas que existem aqui (backup antigo sem coluna nova → fica o padrão)
        const usar = cols.filter((c) => c in linha);
        if (!usar.length) continue;
        db.prepare(`INSERT INTO "${t}" (${usar.map((c) => `"${c}"`).join(', ')}) VALUES (${usar.map(() => '?').join(', ')})`)
          .run(...usar.map((c) => linha[c]));
      }
      contagem[t] = linhas.length;
    }
    const quebradas = db.prepare('PRAGMA foreign_key_check').all();
    if (quebradas.length) throw Object.assign(new Error(`O backup tem ligações quebradas (ex.: tabela ${quebradas[0].table}). Nada foi mudado.`), { amigavel: true });
    // Sessões: só a de quem restaurou, e só se ele continuar sendo o admin com o mesmo id
    const continuaAdmin = manterSessaoDe != null
      && db.prepare("SELECT 1 FROM usuarios WHERE id = ? AND papel = 'admin'").get(manterSessaoDe);
    if (continuaAdmin) db.prepare('DELETE FROM sessoes WHERE usuario_id <> ?').run(manterSessaoDe);
    else db.exec('DELETE FROM sessoes');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    if (!e.amigavel) e.message = `Não deu para restaurar: ${e.message}. Nada foi mudado.`;
    e.amigavel = true;
    throw e;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
  return contagem;
}
