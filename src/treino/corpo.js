// Peso corporal: média móvel de 7 dias e meta de ritmo por objetivo (docs/05 regra 10; docs/01 tabela da dieta).
// Este arquivo também roda no navegador (servido em /js/treino/), então não usa nada do Node.

// Ritmo esperado: emagrecimento −0,5 a −1% do peso por semana; hipertrofia +0,25 a +0,5% por mês
export const METAS = {
  emagrecimento: { min: -1, max: -0.5, por: 'semana', texto: '−0,5 a −1% por semana' },
  hipertrofia: { min: 0.25, max: 0.5, por: 'mês', texto: '+0,25 a +0,5% por mês' },
};
export const SEMANAS_ALERTA = 2; // fora da meta por 2 semanas seguidas → alerta
const DIAS_MES = 30;
const FOLGA_DIAS = 3; // a média de "7 dias atrás" pode vir de até 3 dias antes disso

const dia = (data) => Date.UTC(...data.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)))) / 86400000;
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

// pesos: [{ data: 'AAAA-MM-DD', peso }] → mesma lista em ordem, com a média dos últimos 7 dias (o dia e os 6 anteriores)
export function mediaMovel7(pesos) {
  const ordem = [...pesos].sort((a, b) => a.data.localeCompare(b.data));
  return ordem.map((p) => {
    const d = dia(p.data);
    const janela = ordem.filter((x) => dia(x.data) <= d && dia(x.data) > d - 7);
    return { ...p, media: r2(janela.reduce((t, x) => t + x.peso, 0) / janela.length) };
  });
}

// A média móvel num dia (ou no registro mais próximo antes dele, com até 3 dias de folga)
function mediaEm(serie, d) {
  const antes = serie.filter((p) => dia(p.data) <= d && dia(p.data) >= d - FOLGA_DIAS);
  return antes.length ? antes.at(-1).media : null;
}

// Variação % da média numa janela de 7 dias terminando em d
function ritmoSemana(serie, d) {
  const agora = mediaEm(serie, d);
  const antes = mediaEm(serie, d - 7);
  return agora != null && antes != null ? ((agora - antes) / antes) * 100 : null;
}

// Converte o ritmo semanal para a unidade da meta e diz se está dentro
function dentroDaMeta(meta, pctSemana) {
  const valor = meta.por === 'semana' ? pctSemana : (pctSemana * DIAS_MES) / 7;
  return { valor: r2(valor), dentro: valor >= meta.min && valor <= meta.max, abaixo: valor < meta.min };
}

// Situação do peso para o objetivo da pessoa, olhando as 2 últimas semanas até "hoje"
export function avaliarPeso(pesos, objetivo, hoje) {
  const serie = mediaMovel7(pesos);
  const ultimo = serie.at(-1) || null;
  const meta = METAS[objetivo] || null;
  const base = { ultimo, meta, ritmo: null, alerta: false, mensagem: null };
  if (!ultimo) return base;
  const d = dia(hoje);
  const s1 = ritmoSemana(serie, d);
  const s2 = ritmoSemana(serie, d - 7);
  const ritmo = s1 == null ? null : { semana: r2(s1), mes: r2((s1 * DIAS_MES) / 7) };
  if (!meta) {
    return { ...base, ritmo, mensagem: ritmo ? null : 'Registre o peso por pelo menos 8 dias para ver o ritmo.' };
  }
  if (s1 == null) return { ...base, mensagem: 'Registre o peso por pelo menos 8 dias para ver o ritmo.' };
  const a = dentroDaMeta(meta, s1);
  const b = s2 == null ? null : dentroDaMeta(meta, s2);
  const fmt = (n) => `${n > 0 ? '+' : ''}${String(r1(n)).replace('.', ',')}% por ${meta.por}`;
  if (a.dentro) return { ...base, ritmo, mensagem: `No ritmo certo (${fmt(a.valor)}).` };
  const lento = objetivo === 'emagrecimento' ? !a.abaixo : a.abaixo;
  const texto = objetivo === 'emagrecimento'
    ? (lento ? 'O peso está caindo devagar' : 'O peso está caindo rápido demais (risco de perder massa magra)')
    : (lento ? 'O peso está subindo devagar' : 'O peso está subindo rápido demais (risco de ganhar gordura)');
  // Alerta só quando as SEMANAS_ALERTA (2) últimas semanas ficaram fora da meta
  const alerta = b != null && !b.dentro;
  return { ...base, ritmo, alerta, mensagem: `${texto}: ${fmt(a.valor)}. A meta é ${meta.texto}.` };
}

// Medidas (docs/03 item 13): cintura, peito, braço, coxa, quadril, panturrilha; % de gordura opcional
export const MEDIDAS = [
  { campo: 'cintura', texto: 'Cintura' },
  { campo: 'peito', texto: 'Peito' },
  { campo: 'braco', texto: 'Braço' },
  { campo: 'coxa', texto: 'Coxa' },
  { campo: 'quadril', texto: 'Quadril' },
  { campo: 'panturrilha', texto: 'Panturrilha' },
  { campo: 'gordura', texto: '% de gordura', unidade: '%' },
];
