-- 006: check-in semanal (sono, energia, dor, estresse e dieta de 1 a 5; 5 = melhor). Um por pessoa por semana.
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES usuarios (id),
  semana_iso TEXT NOT NULL,         -- "2026-W43"
  sono INTEGER NOT NULL CHECK (sono BETWEEN 1 AND 5),
  energia INTEGER NOT NULL CHECK (energia BETWEEN 1 AND 5),
  dor INTEGER NOT NULL CHECK (dor BETWEEN 1 AND 5),
  estresse INTEGER NOT NULL CHECK (estresse BETWEEN 1 AND 5),
  dieta INTEGER NOT NULL CHECK (dieta BETWEEN 1 AND 5),
  comentario TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS checkin_semana ON checkins (aluno_id, semana_iso);
