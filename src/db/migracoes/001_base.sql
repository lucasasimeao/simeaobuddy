-- 001: configurações gerais do app (chave/valor).
-- As tabelas de usuários, exercícios, programas etc. chegam nas próximas etapas.
CREATE TABLE IF NOT EXISTS config (
  chave TEXT PRIMARY KEY,
  valor TEXT
);

INSERT OR IGNORE INTO config (chave, valor) VALUES ('nome_app', 'SIMEAOBuddy');
