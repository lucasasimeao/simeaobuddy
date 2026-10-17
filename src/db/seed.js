// npm run seed → cria/atualiza o banco de EXEMPLO (data/exemplo.db).
// Nunca mexe no banco real (data/treino.db).
import { abrirBanco } from './conexao.js';

const CAMINHO_EXEMPLO = 'data/exemplo.db';

const db = abrirBanco(CAMINHO_EXEMPLO);
// Os dados de exemplo (alunos, programa, treinos) entram nas próximas etapas.
const tabelas = db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'").get().n;
db.close();
console.log(`Banco de exemplo pronto em ${CAMINHO_EXEMPLO} (${tabelas} tabelas).`);
