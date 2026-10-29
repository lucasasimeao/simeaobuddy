-- 003: biblioteca de exercícios.
CREATE TABLE IF NOT EXISTS exercicios (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  nome_busca TEXT NOT NULL,          -- nome + apelidos, minúsculo e sem acento
  apelidos TEXT,                     -- outros nomes (ex.: o nome da planilha)
  grupo_primario TEXT NOT NULL,
  grupos_secundarios TEXT NOT NULL DEFAULT '[]',  -- JSON [{grupo, fracao}]
  tipo TEXT NOT NULL CHECK (tipo IN ('multi', 'isolado')),
  estavel INTEGER NOT NULL DEFAULT 0,
  equipamento TEXT NOT NULL,
  incremento_kg REAL NOT NULL,
  video_url TEXT,
  observacoes TEXT,
  substitutos TEXT NOT NULL DEFAULT '[]',         -- JSON [id de exercício]
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS exercicios_nome ON exercicios (nome COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS exercicios_grupo ON exercicios (grupo_primario);
