// npm run seed → cria/atualiza o banco de EXEMPLO (data/exemplo.db).
// Nunca mexe no banco real (data/treino.db).
// Cria um admin de teste e a aluna "Ana Exemplo" com 5 microciclos registrados:
// Micro 1 base · 2 mais reps · 3 mais carga (progrediu) · 4 e 5 abaixo da faixa (regrediu → fadiga alta → deload).
import { abrirBanco } from './conexao.js';
import { gerarHash } from '../auth/senha.js';
import { copiarPrograma } from './programas.js';
import { montarFicha, finalizadosDoPrograma } from './treinos.js';
import { proximoTreino, semanaDaEscada } from '../treino/sequencia.js';

const CAMINHO_EXEMPLO = 'data/exemplo.db';
const ADMIN = { usuario: 'exemplo', senha: 'exemplo123' };

const db = abrirBanco(CAMINHO_EXEMPLO);

if (!db.prepare("SELECT id FROM usuarios WHERE papel = 'admin'").get()) {
  db.prepare("INSERT INTO usuarios (nome, papel, status, usuario, senha_hash) VALUES ('Admin Exemplo', 'admin', 'ativo', ?, ?)")
    .run(ADMIN.usuario, gerarHash(ADMIN.senha));
  console.log(`Admin de exemplo: usuário "${ADMIN.usuario}", senha "${ADMIN.senha}".`);
}

let ana = db.prepare("SELECT id FROM usuarios WHERE google_id = 'exemplo-ana'").get()?.id;
if (!ana) {
  ana = Number(db.prepare("INSERT INTO usuarios (nome, papel, status, google_id, email) VALUES ('Ana Exemplo', 'aluno', 'ativo', 'exemplo-ana', 'ana@exemplo.com')").run().lastInsertRowid);
  db.prepare('INSERT INTO alunos (usuario_id) VALUES (?)').run(ana);
}

let programa = db.prepare("SELECT id, n_microciclos FROM programas WHERE aluno_id = ? AND status = 'ativo'").get(ana);
if (!programa) {
  const modelo = db.prepare('SELECT id FROM programas WHERE aluno_id IS NULL ORDER BY id').get().id;
  programa = db.prepare('SELECT id, n_microciclos FROM programas WHERE id = ?').get(copiarPrograma(db, modelo, ana));
}

// Carga e reps de cada exercício em cada micro (a partir da faixa dele)
function feito(item, micro, k) {
  if (item.metodo === 'muscle_round') return { carga: micro === 3 ? 12 : 10, reps: micro >= 4 ? 3 : 4 };
  const inc = item.exercicio.incremento_kg || 5;
  const base = 20 + 5 * k;
  const min = item.reps_min ?? 6;
  return [
    { carga: base, reps: min + 1 },
    { carga: base, reps: min + 2 },
    { carga: base + inc, reps: min },
    { carga: base + inc, reps: min - 1 },
    { carga: base + inc, reps: min - 2 },
  ][micro - 1];
}

const jaTem = finalizadosDoPrograma(db, programa.id).length;
if (jaTem) {
  console.log(`A Ana Exemplo já tem ${jaTem} treinos. Para recriar, apague ${CAMINHO_EXEMPLO} e rode de novo.`);
} else {
  const sessoes = db.prepare('SELECT id FROM sessoes_modelo WHERE programa_id = ? ORDER BY ordem, id').all(programa.id);
  const total = sessoes.length * 5;
  const inserirSerie = db.prepare(`INSERT INTO series_realizadas (treino_id, item_id, exercicio_id, posicao, bloco, tipo, carga, reps, rir)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (let n = 0; n < total; n++) {
    const prox = proximoTreino(sessoes, finalizadosDoPrograma(db, programa.id));
    const data = new Date(Date.now() - (total - n) * 86400000).toLocaleDateString('sv-SE');
    const id = Number(db.prepare(`INSERT INTO treinos_realizados (aluno_id, programa_id, sessao_id, microciclo, semana_escada, data, inicio, fim, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'finalizado')`).run(ana, programa.id, prox.sessao_id, prox.microciclo,
      semanaDaEscada(prox.microciclo, programa.n_microciclos), data, `${data} 18:00:00`, `${data} 19:05:00`).lastInsertRowid);
    montarFicha(db, id).itens.forEach((item, k) => {
      const { carga, reps } = feito(item, prox.microciclo, k);
      (item.semana?.series || []).forEach((s, p) => {
        const blocos = item.metodo === 'muscle_round' ? Array.from({ length: item.mr_blocos || 4 }, (_, b) => b + 1) : [0];
        for (const b of blocos) {
          const kg = s.tipo === 'bo' ? Math.round((carga * 0.8) / 2.5) * 2.5 : carga;
          inserirSerie.run(id, item.id, item.exercicio.id, p, b, s.tipo, kg, reps, s.rir ?? null);
        }
      });
    });
  }
  console.log(`Criados ${total} treinos de exemplo para a Ana Exemplo (5 microciclos).`);
}

const tabelas = db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'").get().n;
db.close();
console.log(`Banco de exemplo pronto em ${CAMINHO_EXEMPLO} (${tabelas} tabelas).`);
