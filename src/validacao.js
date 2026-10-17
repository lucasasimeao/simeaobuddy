// Validação dos dados que chegam nas rotas. Devolve { dados } ou { erro } com mensagem amigável.

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
