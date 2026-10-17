-- 002: usuários (admin com usuário+senha; alunos com Google), sessões e anamnese.
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'aluno' CHECK (papel IN ('admin', 'aluno')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo', 'inativo')),
  usuario TEXT UNIQUE,             -- login do admin
  senha_hash TEXT,                 -- scrypt$sal$hash
  google_id TEXT UNIQUE,           -- "sub" do Google
  email TEXT,
  foto_url TEXT,
  tentativas_falhas INTEGER NOT NULL DEFAULT 0,
  bloqueado_ate TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  ultimo_acesso TEXT
);

-- Só pode existir um admin
CREATE UNIQUE INDEX IF NOT EXISTS um_admin ON usuarios (papel) WHERE papel = 'admin';

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,     -- sha256 do token do cookie
  usuario_id INTEGER NOT NULL REFERENCES usuarios (id),
  criada_em TEXT NOT NULL DEFAULT (datetime('now')),
  expira_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessoes_usuario ON sessoes (usuario_id);

CREATE TABLE IF NOT EXISTS alunos (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuarios (id),
  sexo TEXT,                       -- M | F | outro
  nascimento TEXT,                 -- AAAA-MM-DD
  altura_cm REAL,
  peso_kg REAL,
  objetivo TEXT,                   -- emagrecimento | hipertrofia
  nivel TEXT,                      -- iniciante | intermediario | avancado
  dias_semana INTEGER,
  minutos_sessao INTEGER,
  equipamentos TEXT,
  restricoes TEXT,                 -- lesões / restrições
  evitar TEXT,                     -- exercícios a evitar
  preferencias TEXT,
  meta_texto TEXT,
  meta_peso REAL,
  atualizado_em TEXT
);
