-- 005: treinos realizados, séries registradas e trocas de exercício na hora.
CREATE TABLE IF NOT EXISTS treinos_realizados (
  id INTEGER PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES usuarios (id),
  programa_id INTEGER NOT NULL REFERENCES programas (id),
  sessao_id INTEGER NOT NULL REFERENCES sessoes_modelo (id),
  microciclo INTEGER NOT NULL,      -- nº do microciclo contando desde o início (1, 2, 3, 4...)
  semana_escada INTEGER NOT NULL,   -- semana da escada usada (1..n do programa; o bloco se repete)
  data TEXT NOT NULL,               -- AAAA-MM-DD (dia do treino)
  inicio TEXT NOT NULL DEFAULT (datetime('now')),
  fim TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizado', 'descartado')),
  observacao TEXT
);
CREATE INDEX IF NOT EXISTS treinos_aluno ON treinos_realizados (aluno_id, data);
CREATE INDEX IF NOT EXISTS treinos_programa ON treinos_realizados (programa_id, sessao_id, microciclo);
-- Só um treino em andamento por pessoa
CREATE UNIQUE INDEX IF NOT EXISTS treino_em_andamento ON treinos_realizados (aluno_id) WHERE status = 'em_andamento';

CREATE TABLE IF NOT EXISTS series_realizadas (
  id INTEGER PRIMARY KEY,
  uuid TEXT UNIQUE,                 -- gerado no celular (fila offline sem duplicar)
  treino_id INTEGER NOT NULL REFERENCES treinos_realizados (id),
  item_id INTEGER NOT NULL REFERENCES itens_sessao (id),
  exercicio_id INTEGER NOT NULL REFERENCES exercicios (id),  -- pode ser o substituto
  posicao INTEGER NOT NULL,         -- posição da série no item (0 = 1ª série válida)
  bloco INTEGER NOT NULL DEFAULT 0, -- bloco do muscle round (1..n); 0 nas outras
  tipo TEXT NOT NULL CHECK (tipo IN ('ws', 'top', 'bo', 'muscle_round')),
  carga REAL NOT NULL,
  reps INTEGER NOT NULL,
  rir INTEGER,
  nota TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS serie_unica ON series_realizadas (treino_id, item_id, posicao, bloco);
CREATE INDEX IF NOT EXISTS series_exercicio ON series_realizadas (exercicio_id);

CREATE TABLE IF NOT EXISTS trocas_treino (
  treino_id INTEGER NOT NULL REFERENCES treinos_realizados (id),
  item_id INTEGER NOT NULL REFERENCES itens_sessao (id),
  exercicio_id INTEGER NOT NULL REFERENCES exercicios (id),
  PRIMARY KEY (treino_id, item_id)
);
