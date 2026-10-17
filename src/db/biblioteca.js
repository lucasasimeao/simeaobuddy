// Preenche a biblioteca quando ela está vazia (banco novo). Nunca sobrescreve o que já existe.
import { montarBiblioteca } from './dados/biblioteca.js';
import { normalizar } from '../treino/grupos.js';

export const textoBusca = (nome, apelidos) => normalizar(`${nome} ${apelidos || ''}`);

export function semearBiblioteca(db) {
  const { n } = db.prepare('SELECT count(*) AS n FROM exercicios').get();
  if (n > 0) return 0;
  const lista = montarBiblioteca();
  const inserir = db.prepare(`INSERT INTO exercicios
    (nome, nome_busca, apelidos, grupo_primario, grupos_secundarios, tipo, estavel, equipamento, incremento_kg, video_url, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const ids = new Map();
  db.exec('BEGIN');
  try {
    for (const e of lista) {
      const { lastInsertRowid } = inserir.run(e.nome, textoBusca(e.nome, e.apelidos), e.apelidos, e.grupo_primario,
        JSON.stringify(e.grupos_secundarios), e.tipo, e.estavel ? 1 : 0, e.equipamento, e.incremento_kg, e.video_url, e.observacoes);
      ids.set(e.chave, Number(lastInsertRowid));
    }
    const salvarSubs = db.prepare('UPDATE exercicios SET substitutos = ? WHERE id = ?');
    for (const e of lista) {
      if (!e.substitutos.length) continue;
      const subs = e.substitutos.map((chave) => {
        if (!ids.has(chave)) throw new Error(`Substituto "${chave}" de "${e.nome}" não existe`);
        return ids.get(chave);
      });
      salvarSubs.run(JSON.stringify(subs), ids.get(e.chave));
    }
    db.exec('COMMIT');
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
  return lista.length;
}
