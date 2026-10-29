// Gera a "PLANILHA AVANÇADO" em .xlsx: uma aba por treino (um bloco por microciclo), Escada e Progressão.
// Os números vão prontos (calculados pelas regras de src/treino/), sem fórmulas: não tem como dar #REF! nem #DIV/0!.
import ExcelJS from 'exceljs';
import { carregarPrograma } from '../db/programas.js';
import { treinosDaPlanilha } from '../db/treinos.js';
import { progressaoDoPrograma } from '../db/progressao.js';
import { tonelagem, totalReps, cargaUtilizada } from '../treino/tonelagem.js';
import { semanaDaEscada } from '../treino/sequencia.js';

const MAX_SERIES = 5;

// Cores do tema do app (ARGB para o Excel)
const COR = {
  fundo: 'FF0A0A0A', superficie: 'FF1C1C1C', borda: 'FFBFBFBF', texto: 'FFFAFAFA', apagado: 'FF8A8A8A',
  destaque: 'FF3B82F6', cabecalho: 'FF262626', feita: 'FFEFF6FF', linhaGrupo: 'FFE5E7EB',
  ok: 'FF15803D', okFundo: 'FFDCFCE7', atencao: 'FFA16207', atencaoFundo: 'FFFEF9C3', erro: 'FFB91C1C', erroFundo: 'FFFEE2E2',
};
const ESTADO = {
  progrediu: ['Progrediu', 'ok'], manteve: ['Manteve', 'atencao'], regrediu: ['Regrediu', 'erro'],
};
const ROTULO_TIPO = { ws: 'WS', top: 'TOP', bo: 'BO', muscle_round: 'MR' };
const FMT = { kg: '#,##0.0#;-#,##0.0#;0', inteiro: '#,##0', pct: '+0.0%;-0.0%;0.0%' };

const faixa = (item) => (item.metodo === 'muscle_round'
  ? `${item.mr_blocos}×${item.mr_reps}`
  : item.reps_min && item.reps_max ? `${item.reps_min}–${item.reps_max}` : '—');
const intervalo = (s) => (s >= 60 && s % 30 === 0 ? `${String(s / 60).replace('.', ',')} min` : `${s} s`);
const dataBR = (d) => (d ? d.split('-').reverse().join('/') : '');
const pct = (v) => (v == null ? '—' : v / 100);
const kgInt = (v) => Math.round(v);

const fino = { style: 'thin', color: { argb: COR.borda } };
const BORDA = { top: fino, left: fino, bottom: fino, right: fino };
const preencher = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

// Nome de aba válido (até 31 letras, sem []:*?/\) e sem repetir
function nomeDeAba(wb, nome) {
  const base = nome.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31);
  let n = base;
  for (let i = 2; wb.getWorksheet(n); i++) n = `${base.slice(0, 28)} ${i}`;
  return n;
}

function titulo(ws, linha, texto, nCols, { cor = COR.destaque, tamanho = 12 } = {}) {
  ws.mergeCells(linha, 1, linha, nCols);
  const c = ws.getCell(linha, 1);
  c.value = texto;
  c.font = { bold: true, size: tamanho, color: { argb: COR.texto } };
  c.fill = preencher(cor);
  c.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(linha).height = 22;
}

function estiloCabecalho(celula) {
  celula.font = { bold: true, color: { argb: COR.texto }, size: 10 };
  celula.fill = preencher(COR.cabecalho);
  celula.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  celula.border = BORDA;
}

function estiloCorpo(row, nCols, { numFmt = {} } = {}) {
  for (let c = 1; c <= nCols; c++) {
    const cel = row.getCell(c);
    cel.border = BORDA;
    if (!cel.alignment) cel.alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle' };
    if (numFmt[c]) cel.numFmt = numFmt[c];
  }
}

function pintarStatus(cel, status) {
  const e = ESTADO[status];
  if (!e) { cel.value = '—'; return; }
  cel.value = e[0];
  cel.font = { bold: true, color: { argb: COR[e[1]] } };
  cel.fill = preencher(COR[`${e[1]}Fundo`]);
}

function corDaVariacao(cel, v) {
  if (v == null || v === 0) return;
  cel.font = { color: { argb: v > 0 ? COR.ok : COR.erro } };
}

// ---------- Aba de um treino: um bloco por microciclo, as colunas da planilha ----------
function abaTreino(wb, dados, sessao, treinos, cabecalhoGeral) {
  const ws = wb.addWorksheet(nomeDeAba(wb, `Treino ${sessao.codigo}`), {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  const nCols = 10 + MAX_SERIES * 2 + 3;
  ws.columns = [
    { width: 5 }, { width: 30 }, { width: 9 }, { width: 8 }, { width: 8 }, { width: 7 }, { width: 10 }, { width: 8 }, { width: 7 }, { width: 10 },
    ...Array.from({ length: MAX_SERIES * 2 }, () => ({ width: 7 })), { width: 8 }, { width: 8 }, { width: 11 },
  ];
  titulo(ws, 1, cabecalhoGeral, nCols, { cor: COR.fundo, tamanho: 13 });

  const n = dados.programa.n_microciclos;
  const daSessao = treinos.filter((t) => t.sessao_id === sessao.id);
  const nBlocos = Math.max(n, ...daSessao.map((t) => t.microciclo));
  let l = 3;
  for (let m = 1; m <= nBlocos; m++) {
    const treino = daSessao.filter((t) => t.microciclo === m).at(-1);
    const sub = treino
      ? `${dataBR(treino.data)}${treino.status === 'em_andamento' ? ' · em andamento' : ''} · ${kgInt(tonelagem(treino.series)).toLocaleString('pt-BR')} kg`
      : `semana ${semanaDaEscada(m, n)} da escada · não executado`;
    titulo(ws, l, `Treino ${sessao.codigo} · ${sessao.nome} – Micro ${m}   (${sub})`, nCols);
    l++;

    // Cabeçalho em 2 linhas, como na planilha original
    const fixos = ['Nº', 'Exercício', 'Séries warm up', 'Séries work', 'Reps work', 'RIR work', 'Séries top', 'Reps top', 'RIR top', 'Intervalo'];
    fixos.forEach((t, i) => { ws.mergeCells(l, i + 1, l + 1, i + 1); ws.getCell(l, i + 1).value = t; });
    for (let k = 0; k < MAX_SERIES; k++) {
      const c = 11 + k * 2;
      ws.mergeCells(l, c, l, c + 1);
      ws.getCell(l, c).value = `Série ${k + 1}`;
      ws.getCell(l + 1, c).value = 'Reps';
      ws.getCell(l + 1, c + 1).value = 'Kg';
    }
    ['Total reps', 'Kg', 'Tonelagem'].forEach((t, i) => { const c = 11 + MAX_SERIES * 2 + i; ws.mergeCells(l, c, l + 1, c); ws.getCell(l, c).value = t; });
    for (const r of [l, l + 1]) for (let c = 1; c <= nCols; c++) estiloCabecalho(ws.getCell(r, c));
    ws.getRow(l).height = 30;
    l += 2;

    sessao.itens.forEach((item, k) => {
      const w = item.semanas.find((x) => x.microciclo === semanaDaEscada(m, n));
      const feitas = treino ? treino.series.filter((x) => x.item_id === item.id) : [];
      const mr = item.metodo === 'muscle_round';
      const celula = (j) => (mr ? feitas.find((x) => x.bloco === j + 1) : feitas.find((x) => x.posicao === j));
      const planejadas = mr ? Array.from({ length: item.mr_blocos || 4 }, () => ({ tipo: 'muscle_round' })) : (w?.series || []);
      const valores = [
        k + 1, item.exercicio.nome, (item.tem_warmup ? 1 : 0) + item.feeders_efetivas.length,
        mr ? '—' : w?.n_ws ?? 0, mr ? '—' : faixa(item), w?.n_ws ? w.rir_ws : '—',
        mr || w?.n_bo ? `${mr ? `${w?.n_mr ?? 0} MR` : w?.n_top ?? 0}${w?.n_bo ? ` + ${w.n_bo} BO` : ''}` : w?.n_top ?? 0,
        faixa(item), w?.n_top ? w.rir_top : '—', intervalo(item.descanso_seg),
      ];
      const tipos = [];
      for (let j = 0; j < MAX_SERIES; j++) {
        const f = celula(j);
        if (f) { valores.push(f.reps, f.carga); tipos.push('feita'); }
        else if (planejadas[j]) { valores.push(ROTULO_TIPO[planejadas[j].tipo] || '', null); tipos.push('plan'); }
        else { valores.push(null, null); tipos.push('sem'); }
      }
      const carga = feitas.length ? cargaUtilizada(feitas) : null;
      valores.push(feitas.length ? totalReps(feitas) : '—', carga ?? '—', feitas.length ? kgInt(tonelagem(feitas)) : '—');
      const row = ws.getRow(l);
      row.values = valores;
      const numFmt = { [nCols]: FMT.inteiro, [nCols - 1]: FMT.kg };
      for (let j = 0; j < MAX_SERIES; j++) numFmt[12 + j * 2] = FMT.kg;
      estiloCorpo(row, nCols, { numFmt });
      row.getCell(nCols).font = { bold: true };
      tipos.forEach((t, j) => {
        for (const c of [11 + j * 2, 12 + j * 2]) {
          const cel = row.getCell(c);
          if (t === 'feita') cel.fill = preencher(COR.feita);
          if (t === 'plan') cel.font = { italic: true, color: { argb: COR.apagado }, size: 9 };
          if (t === 'sem') cel.fill = preencher(COR.linhaGrupo);
        }
      });
      l++;
    });

    ws.mergeCells(l, 1, l, nCols);
    const obs = ws.getCell(l, 1);
    obs.value = `Observações sobre o treino: ${treino?.observacao || '—'}`;
    obs.font = { italic: true, color: { argb: COR.apagado } };
    obs.alignment = { wrapText: true, vertical: 'top' };
    l += 2;
  }
}

// ---------- Aba Escada: exercício × semana ----------
function abaEscada(wb, dados, cabecalhoGeral) {
  const n = dados.programa.n_microciclos;
  const ws = wb.addWorksheet('Escada', { views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }] });
  ws.columns = [{ width: 34 }, ...Array.from({ length: n }, () => ({ width: 14 }))];
  titulo(ws, 1, cabecalhoGeral, n + 1, { cor: COR.fundo, tamanho: 13 });
  const cab = ws.getRow(3);
  cab.values = ['Exercício', ...Array.from({ length: n }, (_, i) => `S${i + 1}`)];
  for (let c = 1; c <= n + 1; c++) estiloCabecalho(cab.getCell(c));
  let l = 4;
  for (const s of dados.sessoes) {
    ws.mergeCells(l, 1, l, n + 1);
    const g = ws.getCell(l, 1);
    g.value = `Treino ${s.codigo} · ${s.nome}`;
    g.font = { bold: true };
    g.fill = preencher(COR.linhaGrupo);
    g.border = BORDA;
    l++;
    for (const item of s.itens) {
      const row = ws.getRow(l);
      row.values = [item.exercicio.nome, ...Array.from({ length: n }, (_, i) => item.semanas.find((w) => w.microciclo === i + 1)?.descricao ?? '—')];
      estiloCorpo(row, n + 1);
      row.getCell(1).alignment = { horizontal: 'left' };
      item.semanas.forEach((w) => { if (w.n_bo && w.microciclo <= n) row.getCell(w.microciclo + 1).font = { bold: true, color: { argb: COR.destaque } }; });
      l++;
    }
  }
  ws.getCell(l + 1, 1).value = 'Em azul: semanas com back-off (BO).';
  ws.getCell(l + 1, 1).font = { italic: true, color: { argb: COR.apagado } };
}

// ---------- Aba Progressão: quadro por micro + um bloco por treino × micro ----------
function abaProgressao(wb, prog, cabecalhoGeral) {
  const ws = wb.addWorksheet('Progressão', { pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
  const nCols = 12;
  ws.columns = [{ width: 7 }, { width: 30 }, { width: 11 }, { width: 10 }, { width: 10 }, { width: 9 }, { width: 10 }, { width: 9 }, { width: 9 }, { width: 10 }, { width: 10 }, { width: 12 }];
  titulo(ws, 1, cabecalhoGeral, nCols, { cor: COR.fundo, tamanho: 13 });

  let l = 3;
  titulo(ws, l, 'Análise por microciclo (todos os treinos juntos)', nCols);
  l++;
  const cab = ws.getRow(l);
  cab.values = ['Micro', 'Mensagem', 'Treinos', 'Tonelagem', 'Variação', 'Fadiga'];
  for (let c = 1; c <= 6; c++) estiloCabecalho(cab.getCell(c));
  l++;
  for (const m of prog.micros) {
    const row = ws.getRow(l);
    row.values = [m.microciclo, m.fadiga.mensagem, m.treinos_feitos, m.treinos_feitos ? kgInt(m.tonelagem) : '—', pct(m.var_comparavel), m.fadiga.texto];
    estiloCorpo(row, 6, { numFmt: { 4: FMT.inteiro, 5: FMT.pct } });
    row.getCell(2).alignment = { horizontal: 'left', wrapText: true };
    corDaVariacao(row.getCell(5), m.var_comparavel);
    const cor = { ok: 'ok', atencao: 'atencao', erro: 'erro' }[m.fadiga.cor];
    if (cor) { row.getCell(6).font = { bold: true, color: { argb: COR[cor] } }; row.getCell(6).fill = preencher(COR[`${cor}Fundo`]); }
    l++;
  }
  const notas = [
    'Variação = tonelagem por série (sem o BO) contra o micro anterior, para a escada não distorcer a comparação.',
    prog.deload.sugerir ? `Sugestão de deload: ${prog.deload.motivo} ${prog.deload.como}` : null,
    prog.checkin ? `Último check-in (${prog.checkin.semana_iso}): média ${String(prog.checkin.media).replace('.', ',')} de 5.` : 'Nenhum check-in semanal ainda.',
  ].filter(Boolean);
  for (const t of notas) {
    ws.mergeCells(l, 1, l, nCols);
    ws.getCell(l, 1).value = t;
    ws.getCell(l, 1).font = { italic: !t.startsWith('Sugestão'), bold: t.startsWith('Sugestão'), color: { argb: t.startsWith('Sugestão') ? COR.erro : COR.apagado } };
    l++;
  }
  l++;

  for (const s of prog.sessoes) {
    for (const b of s.micros) {
      if (!b.executado) {
        titulo(ws, l, `Treino ${s.codigo} · ${s.nome} – Micro ${b.microciclo}   (NÃO EXECUTADO)`, nCols, { cor: COR.apagado });
        l += 2;
        continue;
      }
      titulo(ws, l, `Treino ${s.codigo} · ${s.nome} – Micro ${b.microciclo}   (${dataBR(b.data)} · ${kgInt(b.tonelagem).toLocaleString('pt-BR')} kg${b.micro_anterior ? ` · comparado com o Micro ${b.micro_anterior}` : ''})`, nCols);
      l++;
      [['Nº', 1, 1], ['Exercício', 2, 2], ['Tonelagem', 3, 5], ['Reps', 6, 8], ['Carga', 9, 11], ['Status', 12, 12]].forEach(([t, a, z]) => {
        if (a === z) ws.mergeCells(l, a, l + 1, a); else ws.mergeCells(l, a, l, z);
        ws.getCell(l, a).value = t;
      });
      ['kg', 'vs ant.', 'vs M1', 'total', 'vs ant.', 'desvio', 'kg', 'vs ant.', 'vs M1'].forEach((t, i) => { ws.getCell(l + 1, 3 + i).value = t; });
      for (const r of [l, l + 1]) for (let c = 1; c <= nCols; c++) estiloCabecalho(ws.getCell(r, c));
      l += 2;
      b.exercicios.forEach((e, k) => {
        const row = ws.getRow(l);
        if (e.series) {
          const desvio = [e.desvio.abaixo ? `−${e.desvio.abaixo}` : '', e.desvio.acima ? `+${e.desvio.acima}` : ''].filter(Boolean).join(' ') || 0;
          row.values = [k + 1, e.nome, kgInt(e.tonelagem), pct(e.vs_anterior?.tonelagem), pct(e.vs_micro1?.tonelagem),
            e.reps, pct(e.vs_anterior?.reps), desvio, e.carga ?? '—', pct(e.vs_anterior?.carga), pct(e.vs_micro1?.carga), null];
          estiloCorpo(row, nCols, { numFmt: { 3: FMT.inteiro, 4: FMT.pct, 5: FMT.pct, 7: FMT.pct, 9: FMT.kg, 10: FMT.pct, 11: FMT.pct } });
          for (const [c, v] of [[4, e.vs_anterior?.tonelagem], [5, e.vs_micro1?.tonelagem], [7, e.vs_anterior?.reps], [10, e.vs_anterior?.carga], [11, e.vs_micro1?.carga]]) corDaVariacao(row.getCell(c), v);
          pintarStatus(row.getCell(12), e.status);
        } else {
          row.values = [k + 1, e.nome, 'não registrado'];
          ws.mergeCells(l, 3, l, nCols);
          estiloCorpo(row, nCols);
          row.getCell(3).font = { italic: true, color: { argb: COR.apagado } };
        }
        l++;
      });
      ws.mergeCells(l, 1, l, nCols);
      const f = b.fadiga;
      const contagem = f.comparados ? ` ${f.progrediram} progrediram · ${f.mantiveram} mantiveram · ${f.regrediram} regrediram.` : '';
      const a = ws.getCell(l, 1);
      a.value = `Análise do microciclo: ${f.texto !== '—' ? `fadiga ${f.texto.toLowerCase()}. ` : ''}${f.mensagem}${contagem}`;
      a.font = { bold: true };
      a.alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(l).height = 30;
      l += 2;
    }
  }
}

// Devolve { nome do arquivo, buffer do .xlsx } (ou null se o programa não existe)
export async function gerarPlanilhaXlsx(db, programaId) {
  const dados = carregarPrograma(db, programaId);
  if (!dados) return null;
  const treinos = treinosDaPlanilha(db, programaId);
  const prog = progressaoDoPrograma(db, programaId);
  const { programa } = dados;
  const pessoa = programa.aluno_nome || 'Modelo';
  const cabecalhoGeral = `SIMEAOBuddy · ${pessoa} · ${programa.nome} · exportado em ${new Date().toLocaleDateString('pt-BR')}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIMEAOBuddy';
  wb.created = new Date();
  for (const sessao of dados.sessoes) abaTreino(wb, dados, sessao, treinos, cabecalhoGeral);
  abaEscada(wb, dados, cabecalhoGeral);
  abaProgressao(wb, prog, cabecalhoGeral);

  const limpo = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '');
  const nome = `planilha-${limpo(pessoa)}-${limpo(programa.nome)}-${new Date().toLocaleDateString('sv-SE')}.xlsx`.toLowerCase();
  return { nome, buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}
