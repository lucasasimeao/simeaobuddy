import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, criarAdmin, navegador } from './ajuda.js';
import { MAX_TENTATIVAS } from '../src/routes/auth.js';

const entrar = (nav, usuario, senha) => nav.pedir('/api/auth/entrar', { metodo: 'POST', corpo: { usuario, senha } });

test('admin entra com usuário e senha (sem diferenciar maiúsculas), vê /eu e sai', async () => {
  const s = await subirServidor();
  try {
    const { usuario, senha } = criarAdmin(s.db);
    const nav = navegador(s.url);
    assert.equal((await nav.pedir('/api/auth/eu')).status, 401);

    const r = await entrar(nav, usuario.toUpperCase(), senha);
    assert.equal(r.status, 200);
    assert.equal(r.json.usuario.papel, 'admin');
    assert.ok(nav.cookies().sessao, 'cookie de sessão criado');
    assert.equal((await nav.pedir('/api/auth/eu')).json.usuario.nome, 'Lucas');

    await nav.pedir('/api/auth/sair', { metodo: 'POST' });
    assert.equal((await nav.pedir('/api/auth/eu')).status, 401);
  } finally { s.fechar(); }
});

test('senha errada recusa; depois de 5 erros bloqueia mesmo com a senha certa', async () => {
  const s = await subirServidor();
  try {
    const { usuario, senha } = criarAdmin(s.db);
    const nav = navegador(s.url);
    for (let i = 1; i < MAX_TENTATIVAS; i++) assert.equal((await entrar(nav, usuario, 'errada!!')).status, 401);
    assert.equal((await entrar(nav, usuario, 'errada!!')).status, 429);
    const certa = await entrar(nav, usuario, senha);
    assert.equal(certa.status, 429);
    assert.match(certa.json.erro, /minutos/);
  } finally { s.fechar(); }
});

test('usuário que não existe recebe a mesma mensagem', async () => {
  const s = await subirServidor();
  try {
    const r = await entrar(navegador(s.url), 'fulano', '12345678');
    assert.equal(r.status, 401);
    assert.equal(r.json.erro, 'Usuário ou senha incorretos.');
  } finally { s.fechar(); }
});

test('admin troca a senha: a antiga para de funcionar', async () => {
  const s = await subirServidor();
  try {
    const { usuario, senha } = criarAdmin(s.db);
    const nav = navegador(s.url);
    await entrar(nav, usuario, senha);
    const trocar = (atual, nova) => nav.pedir('/api/auth/senha', { metodo: 'PUT', corpo: { atual, nova } });
    assert.equal((await trocar('errada', 'nova-senha-1')).status, 400);
    assert.equal((await trocar(senha, 'curta')).status, 400);
    assert.equal((await trocar(senha, 'nova-senha-1')).status, 200);
    assert.equal((await nav.pedir('/api/auth/eu')).status, 200, 'continua logado');
    const outro = navegador(s.url);
    assert.equal((await entrar(outro, usuario, senha)).status, 401);
    assert.equal((await entrar(outro, usuario, 'nova-senha-1')).status, 200);
  } finally { s.fechar(); }
});

test('só pode existir um admin', async () => {
  const s = await subirServidor();
  try {
    criarAdmin(s.db);
    assert.throws(() => criarAdmin(s.db, 'outro'));
  } finally { s.fechar(); }
});

test('Google: 1º login cria aluno pendente; depois de aprovado, entra ativo', async () => {
  const perfil = { googleId: 'g-123', email: 'joao@gmail.com', nome: 'João', foto: null };
  const s = await subirServidor({ trocarCodigo: async () => perfil });
  try {
    const nav = navegador(s.url);
    nav.definirCookie('oauth_estado', 'abc');
    const r = await nav.pedir('/api/auth/google/retorno?code=xyz&state=abc');
    assert.equal(r.status, 302);
    assert.equal(r.local, '/#/hoje');
    const eu = (await nav.pedir('/api/auth/eu')).json.usuario;
    assert.equal(eu.status, 'pendente');
    assert.equal(eu.papel, 'aluno');
    assert.equal((await nav.pedir(`/api/alunos/${eu.id}`)).status, 403, 'pendente não acessa dados');

    s.db.prepare("UPDATE usuarios SET status = 'ativo' WHERE id = ?").run(eu.id);
    assert.equal((await nav.pedir(`/api/alunos/${eu.id}`)).status, 200);

    const nav2 = navegador(s.url);
    nav2.definirCookie('oauth_estado', 'def');
    await nav2.pedir('/api/auth/google/retorno?code=xyz&state=def');
    assert.equal(s.db.prepare("SELECT count(*) AS n FROM usuarios WHERE google_id = 'g-123'").get().n, 1, '2º login não duplica');
  } finally { s.fechar(); }
});

test('Google: estado diferente (CSRF) ou conta inativa não entram', async () => {
  const s = await subirServidor({ trocarCodigo: async () => ({ googleId: 'g-9', email: 'x@gmail.com', nome: 'X', foto: null }) });
  try {
    const nav = navegador(s.url);
    nav.definirCookie('oauth_estado', 'abc');
    assert.match((await nav.pedir('/api/auth/google/retorno?code=xyz&state=OUTRO')).local, /erro=google-falhou/);
    assert.equal(nav.cookies().sessao, undefined);

    nav.definirCookie('oauth_estado', 'abc');
    await nav.pedir('/api/auth/google/retorno?code=xyz&state=abc');
    s.db.prepare("UPDATE usuarios SET status = 'inativo' WHERE google_id = 'g-9'").run();
    const nav2 = navegador(s.url);
    nav2.definirCookie('oauth_estado', 'q');
    assert.match((await nav2.pedir('/api/auth/google/retorno?code=xyz&state=q')).local, /erro=inativo/);
  } finally { s.fechar(); }
});

test('Google pelo IP da Wi-Fi (http) avisa para usar o link https', async () => {
  process.env.GOOGLE_CLIENT_ID = 'id-teste';
  process.env.GOOGLE_CLIENT_SECRET = 'segredo-teste';
  const s = await subirServidor();
  try {
    const nav = navegador(s.url);
    // 127.0.0.1 é um IP, como o da Wi-Fi: sem https o Google não aceita
    const wifi = await nav.pedir('/api/auth/google');
    assert.match(wifi.local, /erro=precisa-https/);
    // pelo Tailscale chega com X-Forwarded-Proto: https
    const tailscale = await nav.pedir('/api/auth/google', { cabecalhos: { 'X-Forwarded-Proto': 'https' } });
    assert.match(tailscale.local, /^https:\/\/accounts\.google\.com\//);
    assert.match(decodeURIComponent(tailscale.local), /redirect_uri=https:\/\/127\.0\.0\.1:\d+\/api\/auth\/google\/retorno/);
  } finally {
    s.fechar();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  }
});
