-- 004: programas (blocos/mesociclos), treinos (A–E), itens e a escada por semana.
CREATE TABLE IF NOT EXISTS programas (
  id INTEGER PRIMARY KEY,
  aluno_id INTEGER REFERENCES usuarios (id),   -- NULL = modelo
  nome TEXT NOT NULL,
  descricao TEXT,
  n_microciclos INTEGER NOT NULL DEFAULT 3,
  inicio TEXT,                                 -- AAAA-MM-DD (semana 1)
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'ativo', 'arquivado')),
  origem_id INTEGER REFERENCES programas (id), -- de qual modelo/programa foi copiado
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT
);
-- No máximo 1 programa ativo por pessoa
CREATE UNIQUE INDEX IF NOT EXISTS programa_ativo ON programas (aluno_id) WHERE status = 'ativo' AND aluno_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessoes_modelo (
  id INTEGER PRIMARY KEY,
  programa_id INTEGER NOT NULL REFERENCES programas (id),
  codigo TEXT NOT NULL,      -- A, B, C...
  nome TEXT NOT NULL,        -- Push, Pull...
  ordem INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessoes_programa ON sessoes_modelo (programa_id, ordem);

CREATE TABLE IF NOT EXISTS itens_sessao (
  id INTEGER PRIMARY KEY,
  sessao_id INTEGER NOT NULL REFERENCES sessoes_modelo (id),
  exercicio_id INTEGER NOT NULL REFERENCES exercicios (id),
  ordem INTEGER NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('principal', 'secundario', 'isolado')),  -- define as feeders
  feeders TEXT,              -- JSON [{reps, pct, descanso}] só quando foge do padrão do papel
  warmup TEXT NOT NULL DEFAULT 'auto' CHECK (warmup IN ('auto', 'sim', 'nao')),
  reps_min INTEGER,
  reps_max INTEGER,
  cadencia TEXT NOT NULL DEFAULT '2-0-1-0',
  descanso_seg INTEGER NOT NULL DEFAULT 120,
  metodo TEXT NOT NULL DEFAULT 'normal' CHECK (metodo IN ('normal', 'muscle_round')),
  mr_blocos INTEGER,
  mr_reps INTEGER,
  mr_descanso_seg INTEGER,
  observacoes TEXT
);
CREATE INDEX IF NOT EXISTS itens_sessao_ordem ON itens_sessao (sessao_id, ordem);

-- A escada: quantas séries de cada tipo o item tem em cada microciclo (semana)
CREATE TABLE IF NOT EXISTS itens_semana (
  item_id INTEGER NOT NULL REFERENCES itens_sessao (id),
  microciclo INTEGER NOT NULL,
  n_ws INTEGER NOT NULL DEFAULT 0,
  rir_ws INTEGER NOT NULL DEFAULT 1,
  n_top INTEGER NOT NULL DEFAULT 0,
  rir_top INTEGER NOT NULL DEFAULT 0,
  n_bo INTEGER NOT NULL DEFAULT 0,
  pct_bo REAL NOT NULL DEFAULT 20,           -- % a menos que o top set
  n_mr INTEGER NOT NULL DEFAULT 0,           -- muscle rounds
  PRIMARY KEY (item_id, microciclo)
);
