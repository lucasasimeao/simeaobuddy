-- 007: corpo. Peso diário (um por dia), medidas quinzenais (cm; % de gordura opcional) e fotos (arquivo em data/fotos/).
CREATE TABLE IF NOT EXISTS pesos (
  id INTEGER PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES usuarios (id),
  data TEXT NOT NULL,               -- AAAA-MM-DD
  peso REAL NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS peso_dia ON pesos (aluno_id, data);

CREATE TABLE IF NOT EXISTS medidas (
  id INTEGER PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES usuarios (id),
  data TEXT NOT NULL,
  cintura REAL,
  peito REAL,
  braco REAL,
  coxa REAL,
  quadril REAL,
  panturrilha REAL,
  gordura REAL,                     -- % de gordura (opcional)
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS medida_dia ON medidas (aluno_id, data);

CREATE TABLE IF NOT EXISTS fotos (
  id INTEGER PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES usuarios (id),
  data TEXT NOT NULL,
  arquivo TEXT NOT NULL,            -- nome do arquivo dentro de data/fotos/<aluno_id>/
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS fotos_aluno ON fotos (aluno_id, data);
