// Cria (ou troca a senha do) único admin.
// Uso no PowerShell:  $env:SENHA="..."; npm run criar-admin -- lucasimeao "Lucas Simeão"
// A senha vem só da variável SENHA (não fica salva em arquivo nenhum).
import { abrirBanco } from './conexao.js';
import { gerarHash, senhaValida } from '../auth/senha.js';

const usuario = String(process.argv[2] || '').trim().toLowerCase();
const nome = String(process.argv[3] || usuario).trim();
const senha = process.env.SENHA;

if (!/^[a-z0-9._-]{3,32}$/.test(usuario)) {
  console.error('Informe o usuário (3 a 32 letras minúsculas, números, ponto, traço).');
  process.exit(1);
}
if (!senhaValida(senha)) {
  console.error('Defina a senha na variável SENHA (pelo menos 8 caracteres).');
  process.exit(1);
}

const db = abrirBanco();
const admin = db.prepare("SELECT id FROM usuarios WHERE papel = 'admin'").get();
if (admin) {
  db.prepare("UPDATE usuarios SET usuario = ?, nome = ?, senha_hash = ?, status = 'ativo', tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = ?")
    .run(usuario, nome, gerarHash(senha), admin.id);
  db.prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(admin.id);
  console.log(`Admin atualizado: ${usuario}`);
} else {
  db.prepare("INSERT INTO usuarios (nome, papel, status, usuario, senha_hash) VALUES (?, 'admin', 'ativo', ?, ?)")
    .run(nome, usuario, gerarHash(senha));
  console.log(`Admin criado: ${usuario}`);
}
db.close();
