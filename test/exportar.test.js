import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { subirServidor, criarAdmin, criarAlunoGoogle, navegador } from './ajuda.js';
import { criarSessao } from '../src/auth/sessoes.js';
import { copiarPrograma } from '../src/db/programas.js';
import { gerarBackup, restaurarBackup, validarBackup } from '../src/db/backup.js';
import { abrirBanco } from '../src/db/conexao.js';

async function cenario() {
  const pastaBackups = mkdtempSync(join(tmpdir(), 'backups-teste-'));
  const s = await subirServidor({ pastaBackups });
  const { usuario, senha } = criarAdmin(s.db);
  const admin = navegador(s.url);
  await admin.pedir('/api/auth/entrar', { metodo: 'POST', corpo: { usuario, senha } });
  const idAna = criarAlunoGoogle(s.db, 'Ana');
  const ana = navegador(s.url);
  criarSessao(s.db, { headers: {} }, { cookie: (k, v) => ana.definirCookie(k, v) }, idAna);
  const idModelo = s.db.prepare('SELECT id FROM programas WHERE aluno_id IS NULL').get().id;
  const pAna = copiarPrograma(s.db, idModelo, idAna);
  const fechar = () => { s.fechar(); rmSync(pastaBackups, { recursive: true, force: true }); };
  return { s, admin, ana, idAna, pAna, pastaBackups, fechar };
}

// Baixa um arquivo com os cookies do "navegador"
async function baixar(s, nav, caminho) {
  const cookie = Object.entries(nav.cookies()).map(([k, v]) => `${k}=${v}`).join('; ');
  const r = await fetch(s.url + caminho, { headers: { Cookie: cookie } });
  return { status: r.status, tipo: r.headers.get('content-type'), disposicao: r.headers.get('content-disposition'), buffer: Buffer.from(await r.arrayBuffer()) };
}

async function fazerUmTreino(ana) {
  const ficha = (await ana.pedir('/api/treinos', { metodo: 'POST', corpo: {} })).json;
  const item = ficha.itens[0];
  await ana.pedir(`/api/treinos/${ficha.treino.id}/series`, { metodo: 'PUT', corpo: { item_id: item.id, posicao: 0, carga: 60, reps: 8 } });
  await ana.pedir(`/api/treinos/${ficha.treino.id}/series`, { metodo: 'PUT', corpo: { item_id: item.id, posicao: 1, carga: 60, reps: 7 } });
  await ana.pedir(`/api/treinos/${ficha.treino.id}/finalizar`, { metodo: 'POST', corpo: { observacao: 'Bom treino' } });
  return item;
}

test('Excel: abas por treino + Escada + Progressão, com os dados e sem fórmulas', async () => {
  const { s, admin, ana, pAna, fechar } = await cenario();
  try {
    const item = await fazerUmTreino(ana);
    const r = await baixar(s, admin, `/api/exportar/planilha/${pAna}`);
    assert.equal(r.status, 200);
    assert.match(r.tipo, /spreadsheetml/);
    assert.match(r.disposicao, /attachment; filename="?planilha-ana-.*\.xlsx/);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(r.buffer);
    assert.deepEqual(wb.worksheets.map((w) => w.name), ['Treino A', 'Treino B', 'Treino C', 'Treino D', 'Treino E', 'Escada', 'Progressão']);

    let formulas = 0;
    const textos = [];
    wb.eachSheet((ws) => ws.eachRow((row) => row.eachCell((c) => {
      if (c.formula || c.type === ExcelJS.ValueType.Formula) formulas++;
      textos.push(String(c.value ?? ''));
    })));
    assert.equal(formulas, 0);
    assert.ok(!textos.some((t) => /#REF!|#DIV\/0!|NaN|undefined|\[object/.test(t)), 'nenhum valor quebrado');

    // A linha do 1º exercício do Treino A no Micro 1: 8 × 60 e 7 × 60, total 15 reps, 900 kg
    const a = wb.getWorksheet('Treino A');
    let linha = null;
    a.eachRow((row) => { if (row.getCell(2).value === item.exercicio.nome && !linha) linha = row; });
    assert.ok(linha);
    assert.equal(linha.getCell(11).value, 8);
    assert.equal(linha.getCell(12).value, 60);
    assert.equal(linha.getCell(13).value, 7);
    assert.equal(linha.getCell(21).value, 15);
    assert.equal(linha.getCell(23).value, 900);
    assert.ok(textos.some((t) => t.includes('Observações sobre o treino: Bom treino')));
    assert.ok(textos.some((t) => t === '2 WS + 1 BO'), 'a escada aparece na aba Escada');
  } finally {
    fechar();
  }
});

test('Excel e backup: só o admin baixa', async () => {
  const { s, ana, pAna, fechar } = await cenario();
  try {
    assert.equal((await baixar(s, ana, `/api/exportar/planilha/${pAna}`)).status, 403);
    assert.equal((await baixar(s, ana, '/api/backup')).status, 403);
    assert.equal((await ana.pedir('/api/backup/restaurar', { metodo: 'POST', corpo: { confirmar: 'RESTAURAR', backup: {} } })).status, 403);
    assert.equal((await baixar(s, navegador(s.url), '/api/backup')).status, 401);
  } finally {
    fechar();
  }
});

test('Excel de programa que não existe → 404', async () => {
  const { s, admin, fechar } = await cenario();
  try {
    assert.equal((await baixar(s, admin, '/api/exportar/planilha/9999')).status, 404);
  } finally {
    fechar();
  }
});

test('Backup: baixa todas as tabelas, sem as sessões de login', async () => {
  const { s, admin, ana, fechar } = await cenario();
  try {
    await fazerUmTreino(ana);
    const r = await baixar(s, admin, '/api/backup');
    assert.equal(r.status, 200);
    assert.match(r.disposicao, /backup-simeaobuddy-.*\.json/);
    const b = JSON.parse(r.buffer.toString('utf8'));
    assert.equal(b.app, 'SIMEAOBuddy');
    assert.ok(!('sessoes' in b.tabelas));
    assert.ok(!('_migracoes' in b.tabelas));
    assert.equal(b.tabelas.usuarios.length, 2);
    assert.equal(b.tabelas.treinos_realizados.length, 1);
    assert.equal(b.tabelas.series_realizadas.length, 2);
    assert.ok(b.tabelas.exercicios.length >= 170);
  } finally {
    fechar();
  }
});

test('Restaurar: volta os dados, guarda uma cópia antes e o admin continua logado', async () => {
  const { s, admin, ana, pastaBackups, fechar } = await cenario();
  try {
    const backup = JSON.parse((await baixar(s, admin, '/api/backup')).buffer.toString('utf8'));
    // Depois do backup: um treino e um peso novos
    await fazerUmTreino(ana);
    await ana.pedir('/api/corpo/peso', { metodo: 'PUT', corpo: { peso: 70 } });
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM pesos').get().n, 1);

    const r = await admin.pedir('/api/backup/restaurar', { metodo: 'POST', corpo: { confirmar: 'RESTAURAR', backup } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM pesos').get().n, 0);
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM treinos_realizados').get().n, 0);
    assert.equal(readdirSync(pastaBackups).filter((f) => f.startsWith('antes-de-restaurar-')).length, 1);

    // A cópia de segurança tem o estado de antes (com o peso)
    const copia = abrirBanco(join(pastaBackups, readdirSync(pastaBackups)[0]));
    assert.equal(copia.prepare('SELECT count(*) AS n FROM pesos').get().n, 1);
    copia.close();

    assert.equal((await admin.pedir('/api/backup')).status, 200, 'o admin continua logado');
    assert.equal((await ana.pedir('/api/corpo/peso', { metodo: 'PUT', corpo: { peso: 71 } })).status, 401, 'as outras sessões saem');
  } finally {
    fechar();
  }
});

test('Restaurar: sem confirmar ou com arquivo errado não muda nada', async () => {
  const { s, admin, ana, pastaBackups, fechar } = await cenario();
  try {
    await ana.pedir('/api/corpo/peso', { metodo: 'PUT', corpo: { peso: 70 } });
    const backup = JSON.parse((await baixar(s, admin, '/api/backup')).buffer.toString('utf8'));
    const pedir = (corpo) => admin.pedir('/api/backup/restaurar', { metodo: 'POST', corpo });

    assert.equal((await pedir({ confirmar: 'sim', backup })).status, 400);
    assert.equal((await pedir({ confirmar: 'RESTAURAR', backup: { qualquer: 1 } })).status, 400);
    assert.equal((await pedir({ confirmar: 'RESTAURAR', backup: { ...backup, tabelas: { ...backup.tabelas, tabela_nova: [] } } })).status, 400);
    const semAdmin = { ...backup, tabelas: { ...backup.tabelas, usuarios: backup.tabelas.usuarios.filter((u) => u.papel !== 'admin') } };
    const r = await pedir({ confirmar: 'RESTAURAR', backup: semAdmin });
    assert.equal(r.status, 400);
    assert.match(r.json.erro, /admin/);
    assert.equal(readdirSync(pastaBackups).length, 0, 'nada validado → nenhuma cópia');
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM pesos').get().n, 1);
  } finally {
    fechar();
  }
});

test('Restaurar: ligação quebrada desfaz tudo (transação)', () => {
  const db = abrirBanco(':memory:');
  db.prepare("INSERT INTO usuarios (nome, papel, status, usuario) VALUES ('Lucas', 'admin', 'ativo', 'lucas')").run();
  db.prepare("INSERT INTO pesos (aluno_id, data, peso) VALUES (1, '2026-10-01', 80)").run();
  const backup = gerarBackup(db);
  backup.tabelas.pesos = [{ id: 1, aluno_id: 999, data: '2026-10-02', peso: 70 }]; // pessoa que não existe
  assert.throws(() => restaurarBackup(db, backup), /ligações quebradas/);
  assert.deepEqual(db.prepare('SELECT aluno_id, peso FROM pesos').all().map((p) => ({ ...p })), [{ aluno_id: 1, peso: 80 }]);
  assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1, 'as chaves voltam a ser conferidas');
});

test('Restaurar: backup antigo sem uma coluna nova usa o padrão', () => {
  const db = abrirBanco(':memory:');
  db.prepare("INSERT INTO usuarios (nome, papel, status, usuario) VALUES ('Lucas', 'admin', 'ativo', 'lucas')").run();
  const backup = gerarBackup(db);
  backup.tabelas.usuarios = backup.tabelas.usuarios.map(({ tentativas_falhas, ...u }) => u);
  delete backup.tabelas.fotos; // tabela que ainda não existia
  assert.equal(validarBackup(db, backup), null);
  restaurarBackup(db, backup);
  assert.equal(db.prepare('SELECT tentativas_falhas FROM usuarios').get().tentativas_falhas, 0);
});
