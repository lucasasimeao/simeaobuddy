// Validação dos dados que chegam nas rotas. Devolve { dados } ou { erro } com mensagem amigável.
import { GRUPOS, EQUIPAMENTOS } from './treino/grupos.js';

export const OBJETIVOS = ['emagrecimento', 'hipertrofia'];
export const NIVEIS = ['iniciante', 'intermediario', 'avancado'];
export const SEXOS = ['M', 'F', 'outro'];

const vazio = (v) => v === undefined || v === null || v === '';

function texto(v, max, rotulo) {
  if (vazio(v)) return { valor: null };
  if (typeof v !== 'string') return { erro: `${rotulo}: texto inválido.` };
  const t = v.trim();
  if (t.length > max) return { erro: `${rotulo}: no máximo ${max} caracteres.` };
  return { valor: t || null };
}

function numero(v, min, max, rotulo, inteiro = false) {
  if (vazio(v)) return { valor: null };
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < min || n > max || (inteiro && !Number.isInteger(n))) {
    return { erro: `${rotulo}: use um número entre ${min} e ${max}.` };
  }
  return { valor: n };
}

function opcao(v, lista, rotulo) {
  if (vazio(v)) return { valor: null };
  if (!lista.includes(v)) return { erro: `${rotulo}: opção inválida.` };
  return { valor: v };
}

function data(v, rotulo) {
  if (vazio(v)) return { valor: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return { erro: `${rotulo}: data inválida.` };
  const ano = Number(v.slice(0, 4));
  if (ano < 1920 || Date.parse(v) > Date.now()) return { erro: `${rotulo}: data fora do esperado.` };
  return { valor: v };
}

// Campos da anamnese: nome → validador
const CAMPOS = {
  sexo: (v) => opcao(v, SEXOS, 'Sexo'),
  nascimento: (v) => data(v, 'Nascimento'),
  altura_cm: (v) => numero(v, 100, 250, 'Altura (cm)'),
  peso_kg: (v) => numero(v, 30, 300, 'Peso (kg)'),
  objetivo: (v) => opcao(v, OBJETIVOS, 'Objetivo'),
  nivel: (v) => opcao(v, NIVEIS, 'Nível'),
  dias_semana: (v) => numero(v, 1, 7, 'Dias por semana', true),
  minutos_sessao: (v) => numero(v, 15, 240, 'Minutos por sessão', true),
  equipamentos: (v) => texto(v, 500, 'Equipamentos'),
  restricoes: (v) => texto(v, 1000, 'Lesões/restrições'),
  evitar: (v) => texto(v, 500, 'Exercícios a evitar'),
  preferencias: (v) => texto(v, 500, 'Preferências'),
  meta_texto: (v) => texto(v, 300, 'Meta'),
  meta_peso: (v) => numero(v, 30, 300, 'Meta de peso (kg)'),
};
export const CAMPOS_ANAMNESE = Object.keys(CAMPOS);

export function validarAnamnese(entrada = {}) {
  const dados = {};
  for (const [campo, validar] of Object.entries(CAMPOS)) {
    const r = validar(entrada[campo]);
    if (r.erro) return { erro: r.erro };
    dados[campo] = r.valor;
  }
  return { dados };
}

export function validarNome(v) {
  const r = texto(v, 60, 'Nome');
  if (r.erro) return r;
  if (!r.valor || r.valor.length < 2) return { erro: 'Nome: escreva pelo menos 2 letras.' };
  return { valor: r.valor };
}

// --- Exercícios ---
export function validarExercicio(e = {}) {
  const nome = texto(e.nome, 80, 'Nome');
  if (nome.erro) return { erro: nome.erro };
  if (!nome.valor || nome.valor.length < 2) return { erro: 'Nome: escreva pelo menos 2 letras.' };
  if (!GRUPOS[e.grupo_primario]) return { erro: 'Escolha o grupo muscular principal.' };
  if (!['multi', 'isolado'].includes(e.tipo)) return { erro: 'Escolha se é multiarticular ou isolado.' };
  if (!EQUIPAMENTOS[e.equipamento]) return { erro: 'Escolha o equipamento.' };

  const sec = Array.isArray(e.grupos_secundarios) ? e.grupos_secundarios : [];
  const vistos = new Set([e.grupo_primario]);
  for (const s of sec) {
    if (!GRUPOS[s?.grupo]) return { erro: 'Grupo secundário inválido.' };
    if (vistos.has(s.grupo)) return { erro: 'Um grupo secundário está repetido (ou é igual ao principal).' };
    vistos.add(s.grupo);
    const f = Number(s.fracao);
    if (!(f > 0 && f <= 1)) return { erro: 'A fração do grupo secundário vai de 0,1 a 1.' };
  }

  const inc = numero(e.incremento_kg, 0.25, 50, 'Incremento (kg)');
  if (inc.erro || inc.valor === null) return { erro: inc.erro || 'Informe o incremento de carga.' };

  let video = null;
  if (!vazio(e.video_url)) {
    try {
      const u = new URL(String(e.video_url).trim());
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
      video = u.toString();
    } catch {
      return { erro: 'Link do vídeo inválido (precisa começar com https://).' };
    }
  }
  const obs = texto(e.observacoes, 1000, 'Observações');
  if (obs.erro) return { erro: obs.erro };
  const apelidos = texto(e.apelidos, 200, 'Outros nomes');
  if (apelidos.erro) return { erro: apelidos.erro };

  const subs = Array.isArray(e.substitutos) ? [...new Set(e.substitutos.map(Number))] : [];
  if (subs.some((n) => !Number.isInteger(n) || n <= 0)) return { erro: 'Substituto inválido.' };
  if (subs.length > 10) return { erro: 'No máximo 10 substitutos.' };

  return {
    dados: {
      nome: nome.valor,
      apelidos: apelidos.valor,
      grupo_primario: e.grupo_primario,
      grupos_secundarios: sec.map((s) => ({ grupo: s.grupo, fracao: Number(s.fracao) })),
      tipo: e.tipo,
      estavel: Boolean(e.estavel),
      equipamento: e.equipamento,
      incremento_kg: inc.valor,
      video_url: video,
      observacoes: obs.valor,
      substitutos: subs,
    },
  };
}

// --- Programas ---
export const PAPEIS = ['principal', 'secundario', 'isolado'];

export function validarPrograma(p = {}) {
  const nome = texto(p.nome, 100, 'Nome do programa');
  if (nome.erro) return { erro: nome.erro };
  if (!nome.valor || nome.valor.length < 2) return { erro: 'Dê um nome ao programa.' };
  const n = numero(p.n_microciclos, 1, 12, 'Nº de microciclos (semanas)', true);
  if (n.erro || n.valor === null) return { erro: n.erro || 'Informe o nº de microciclos.' };
  const descricao = texto(p.descricao, 500, 'Descrição');
  if (descricao.erro) return { erro: descricao.erro };
  let inicio = { valor: null };
  if (!vazio(p.inicio)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.inicio) || Number.isNaN(Date.parse(p.inicio))) return { erro: 'Data de início inválida.' };
    inicio = { valor: p.inicio };
  }
  return { dados: { nome: nome.valor, n_microciclos: n.valor, descricao: descricao.valor, inicio: inicio.valor } };
}

export function validarSessao(s = {}) {
  const codigo = texto(s.codigo, 3, 'Código do treino');
  if (codigo.erro || !codigo.valor) return { erro: codigo.erro || 'Informe o código do treino (ex.: A).' };
  const nome = texto(s.nome, 40, 'Nome do treino');
  if (nome.erro || !nome.valor) return { erro: nome.erro || 'Informe o nome do treino (ex.: Push).' };
  return { dados: { codigo: codigo.valor.toUpperCase(), nome: nome.valor } };
}

export function validarItem(i = {}) {
  if (!PAPEIS.includes(i.papel)) return { erro: 'Escolha o papel: principal, secundário ou isolado.' };
  if (!['auto', 'sim', 'nao'].includes(i.warmup ?? 'auto')) return { erro: 'Warm-up inválido.' };
  if (!['normal', 'muscle_round'].includes(i.metodo ?? 'normal')) return { erro: 'Método inválido.' };
  const mr = (i.metodo ?? 'normal') === 'muscle_round';

  const min = numero(i.reps_min, 1, 50, 'Reps mínimas', true);
  const max = numero(i.reps_max, 1, 100, 'Reps máximas', true);
  if (min.erro || max.erro) return { erro: min.erro || max.erro };
  if (!mr && (min.valor === null || max.valor === null)) return { erro: 'Informe a faixa de reps (ex.: 5 a 9).' };
  if (min.valor !== null && max.valor !== null && min.valor > max.valor) return { erro: 'As reps mínimas passam das máximas.' };

  const desc = numero(i.descanso_seg, 0, 600, 'Descanso (s)', true);
  if (desc.erro || desc.valor === null) return { erro: desc.erro || 'Informe o descanso.' };
  const cad = String(i.cadencia ?? '2-0-1-0').trim();
  if (!/^[0-9X]-[0-9X]-[0-9X]-[0-9X]$/i.test(cad)) return { erro: 'Cadência no formato 2-0-1-0.' };

  const blocos = numero(i.mr_blocos, 1, 10, 'Blocos do Muscle Round', true);
  const repsMr = numero(i.mr_reps, 1, 30, 'Reps por bloco', true);
  const descMr = numero(i.mr_descanso_seg, 0, 60, 'Descanso entre blocos (s)', true);
  if (blocos.erro || repsMr.erro || descMr.erro) return { erro: blocos.erro || repsMr.erro || descMr.erro };

  let feeders = null;
  if (Array.isArray(i.feeders)) {
    if (i.feeders.length > 3) return { erro: 'No máximo 3 feeders.' };
    feeders = [];
    for (const f of i.feeders) {
      const reps = texto(f?.reps, 10, 'Reps da feeder');
      const pct = numero(f?.pct, 10, 100, '% da feeder', true);
      const d = numero(f?.descanso, 0, 300, 'Descanso da feeder', true);
      if (reps.erro || pct.erro || d.erro || !reps.valor || pct.valor === null) return { erro: reps.erro || pct.erro || d.erro || 'Feeder incompleta.' };
      feeders.push({ reps: reps.valor, pct: pct.valor, descanso: d.valor ?? 45 });
    }
  }
  const obs = texto(i.observacoes, 500, 'Observações');
  if (obs.erro) return { erro: obs.erro };

  return {
    dados: {
      papel: i.papel, warmup: i.warmup ?? 'auto', metodo: i.metodo ?? 'normal', feeders,
      reps_min: min.valor, reps_max: max.valor, descanso_seg: desc.valor, cadencia: cad.toUpperCase(),
      mr_blocos: mr ? (blocos.valor ?? 4) : null, mr_reps: mr ? (repsMr.valor ?? 4) : null, mr_descanso_seg: mr ? (descMr.valor ?? 10) : null,
      observacoes: obs.valor,
    },
  };
}

// Uma semana da escada
export function validarSemana(s = {}) {
  const regras = [
    ['microciclo', 1, 12, 'Semana'], ['n_ws', 0, 6, 'Nº de WS'], ['rir_ws', 0, 5, 'RIR das WS'], ['n_top', 0, 2, 'Nº de TOP'],
    ['rir_top', 0, 5, 'RIR do TOP'], ['n_bo', 0, 3, 'Nº de BO'], ['pct_bo', 5, 50, '% do back-off'], ['n_mr', 0, 3, 'Nº de Muscle Rounds'],
  ];
  const dados = {};
  for (const [campo, min, max, rotulo] of regras) {
    const r = numero(s[campo], min, max, rotulo, campo !== 'pct_bo');
    if (r.erro || r.valor === null) return { erro: r.erro || `${rotulo}: obrigatório.` };
    dados[campo] = r.valor;
  }
  if (dados.n_bo > 0 && dados.n_top === 0) return { erro: 'O back-off vem depois do TOP: coloque 1 TOP.' };
  return { dados };
}

// --- Séries registradas ---
// O tipo vem do plano (posição na semana), não do celular: a 3ª série de "2 WS + 1 BO" é sempre BO.
export function validarSerie(s = {}, item) {
  const mr = item.metodo === 'muscle_round';
  const planejadas = item.semana?.series || [];
  const posicao = Number(s.posicao);
  if (!Number.isInteger(posicao) || posicao < 0 || posicao >= planejadas.length) return { erro: 'Essa série não existe nesta semana.' };
  const tipo = planejadas[posicao].tipo;
  let bloco = 0;
  if (mr) {
    bloco = Number(s.bloco);
    if (!Number.isInteger(bloco) || bloco < 1 || bloco > (item.mr_blocos || 4)) return { erro: 'Bloco do Muscle Round inválido.' };
  }
  const carga = numero(s.carga, 0, 1000, 'Carga (kg)');
  if (carga.erro || carga.valor === null) return { erro: carga.erro || 'Informe a carga (kg).' };
  const reps = numero(s.reps, 0, 100, 'Reps', true);
  if (reps.erro || reps.valor === null) return { erro: reps.erro || 'Informe as reps.' };
  const rir = numero(s.rir, 0, 10, 'RIR', true);
  if (rir.erro) return { erro: rir.erro };
  const uuid = vazio(s.uuid) ? null : String(s.uuid).slice(0, 64);
  // Sem RIR informado, fica o RIR planejado da série (usado no e1RM e na sugestão de carga)
  return { dados: { posicao, bloco, tipo, carga: carga.valor, reps: reps.valor, rir: rir.valor ?? planejadas[posicao].rir ?? null, uuid } };
}

// --- Corpo: data (padrão hoje, nunca no futuro), peso e medidas ---
export function validarDataCorpo(v, hoje) {
  if (vazio(v)) return { valor: hoje };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return { erro: 'Data inválida.' };
  if (v > hoje) return { erro: 'A data não pode ser no futuro.' };
  if (v < '2000-01-01') return { erro: 'Data fora do esperado.' };
  return { valor: v };
}

export function validarPeso(p = {}, hoje) {
  const data = validarDataCorpo(p.data, hoje);
  if (data.erro) return { erro: data.erro };
  const peso = numero(p.peso, 30, 300, 'Peso (kg)');
  if (peso.erro || peso.valor === null) return { erro: peso.erro || 'Informe o peso.' };
  return { dados: { data: data.valor, peso: Math.round(peso.valor * 10) / 10 } };
}

export function validarMedidas(m = {}, campos, hoje) {
  const data = validarDataCorpo(m.data, hoje);
  if (data.erro) return { erro: data.erro };
  const dados = { data: data.valor };
  for (const c of campos) {
    const n = c.unidade === '%' ? numero(m[c.campo], 2, 70, c.texto) : numero(m[c.campo], 10, 250, `${c.texto} (cm)`);
    if (n.erro) return { erro: n.erro };
    dados[c.campo] = n.valor;
  }
  if (campos.every((c) => dados[c.campo] === null)) return { erro: 'Preencha pelo menos uma medida.' };
  const obs = texto(m.observacao, 300, 'Observação');
  if (obs.erro) return { erro: obs.erro };
  dados.observacao = obs.valor;
  return { dados };
}

// --- Check-in semanal: as 5 notas de 1 a 5 são obrigatórias ---
export function validarCheckin(c = {}, perguntas) {
  const dados = {};
  for (const p of perguntas) {
    const n = numero(c[p.campo], 1, 5, p.texto, true);
    if (n.erro || n.valor === null) return { erro: n.erro || `${p.texto}: escolha uma nota de 1 a 5.` };
    dados[p.campo] = n.valor;
  }
  const comentario = texto(c.comentario, 500, 'Comentário');
  if (comentario.erro) return { erro: comentario.erro };
  dados.comentario = comentario.valor;
  return { dados };
}
