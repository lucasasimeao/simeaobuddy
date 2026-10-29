// Ajudantes dos testes: servidor num banco em memória + "navegador" com cookies.
import { abrirBanco } from '../src/db/conexao.js';
import { criarApp } from '../src/app.js';
import { gerarHash } from '../src/auth/senha.js';

export async function subirServidor(opcoes) {
  const db = abrirBanco(':memory:');
  const servidor = criarApp(db, opcoes).listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  const url = `http://127.0.0.1:${servidor.address().port}`;
  return { db, url, fechar: () => servidor.close() };
}

export function criarAdmin(db, usuario = 'admin', senha = 'senha-teste-123') {
  db.prepare("INSERT INTO usuarios (nome, papel, status, usuario, senha_hash) VALUES ('Lucas', 'admin', 'ativo', ?, ?)")
    .run(usuario, gerarHash(senha));
  return { usuario, senha };
}

export function criarAlunoGoogle(db, nome, status = 'ativo') {
  const { lastInsertRowid: id } = db.prepare(
    "INSERT INTO usuarios (nome, papel, status, google_id, email) VALUES (?, 'aluno', ?, ?, ?)",
  ).run(nome, status, `g-${nome}`, `${nome.toLowerCase()}@gmail.com`);
  db.prepare('INSERT INTO alunos (usuario_id) VALUES (?)').run(id);
  return Number(id);
}

// Cliente com cookie (como um navegador)
export function navegador(url) {
  let cookies = {};
  async function pedir(caminho, { metodo = 'GET', corpo, cabecalhos = {} } = {}) {
    const r = await fetch(url + caminho, {
      method: metodo,
      redirect: 'manual',
      headers: {
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        Cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
        ...cabecalhos,
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    for (const c of r.headers.getSetCookie()) {
      const [par] = c.split(';');
      const [k, ...v] = par.split('=');
      if (/Expires=Thu, 01 Jan 1970/i.test(c) || v.join('=') === '') delete cookies[k];
      else cookies[k] = v.join('=');
    }
    const tipo = r.headers.get('content-type') || '';
    return { status: r.status, local: r.headers.get('location'), headers: r.headers, json: tipo.includes('json') ? await r.json() : null };
  }
  return { pedir, cookies: () => cookies, definirCookie: (k, v) => { cookies[k] = v; } };
}
