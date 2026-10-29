// Seed da biblioteca: os 170 exercícios da PLANILHA AVANÇADO (docs/exercicios-da-planilha.txt)
// + os das fichas (docs/04 §5), com vídeo, observações e substitutos.
// Cada seção tem um padrão (grupo, secundários, tipo); um item pode sobrescrever: [nome, { ... }].
import { incrementoPadrao, estavelPadrao, FRACAO_INDIRETA } from '../../treino/grupos.js';

const SECOES = [
  { grupo: 'peito', sec: ['triceps', 'ombro_anterior'], tipo: 'multi', itens: [
    'SUPINO RETO BARRA', 'SUPINO RETO HALTER', 'SUPINO RETO SMITH', 'SUPINO RETO MÁQUINA HORIZONTAL',
    'SUPINO RETO MÁQUINA VERTICAL', 'SUPINO INCLINADO BARRA', 'SUPINO INCLINADO HALTER', 'SUPINO INCLINADO MÁQUINA',
    'SUPINO INCLINADO SMITH', 'SUPINO DECLINADO BARRA', 'SUPINO INCLINADO NEUTRO HALTER', 'SUPINO DECLINADO HALTER',
    'SUPINO DECLINADO MÁQUINA', 'SUPINO DECLINADO SMITH', ['FLEXÃO DE BRAÇO', { equipamento: 'corporal' }],
  ] },
  { grupo: 'peito', sec: [], tipo: 'isolado', itens: [
    'VOADOR INCLINADO HALTER', 'VOADOR RETO HALTER', 'VOADOR DECLINADO HALTER', 'VOADOR POLIA RETA',
    'VOADOR POLIA BAIXA', 'VOADOR POLIA ALTA', 'VOADOR MÁQUINA', ['PEC DECK', { equipamento: 'maquina' }],
  ] },
  { grupo: 'triceps', sec: [], tipo: 'isolado', itens: [
    'TRICEPS TESTA BARRA W', 'TRICEPS TESTA HALTER BANCO INCLIN', 'TRICEPS TESTA HALTER', 'TRICEPS TESTA POLIA',
    ['TRICEPS CORDA', { equipamento: 'polia' }], 'TRICEPS POLIA', 'TRICEPS UNILATERAL POLIA', 'TRICEPS CRUZADO POLIA',
    'TRICEPS CRUZADO POLIA UNILATERAL', ['TRICEPS FRANCES CORDA', { equipamento: 'polia' }], 'TRICEPS FRANCES HALTER',
    'TRICEPS FRANCES POLIA', 'TRICEPS FRANCES BARRA W', 'TRICEPS FRANCES UNI POLIA', 'TRICEPS MÁQUINA', 'TRICEPS FRANCES UNI HALTER',
  ] },
  { grupo: 'triceps', sec: ['peito', 'ombro_anterior'], tipo: 'multi', itens: [
    'PARALELAS MÁQUINA', ['PARALELAS', { equipamento: 'corporal' }], ['SUPINO PEGADA FECHADA', { equipamento: 'barra' }],
  ] },
  { grupo: 'costas', sec: ['biceps'], tipo: 'multi', itens: [
    'PUXADA UNILATERAL', 'PUXADA ABERTA', 'PUXADA TRIÂNGULO', 'PUXADA CORDA', 'PUXADA FECHADA PRONADA', 'PUXADA SUPINADA',
    ['PUXADA HAMMER UNILATERAL', { equipamento: 'maquina' }], ['PUXADA HAMMER', { equipamento: 'maquina' }],
    ['BARRA FIXA PEGADA ABERTA', { equipamento: 'corporal' }], ['BARRA FIXA PEGADA SUPINADA', { equipamento: 'corporal' }],
  ] },
  { grupo: 'costas', sec: [], tipo: 'isolado', itens: [
    ['PULL DOWN CORDA', { equipamento: 'polia' }], ['PULL DOWN POLIA', { equipamento: 'polia' }], ['PULL DOWN POLIA C/ BANCO INCLINADO', { equipamento: 'polia' }],
  ] },
  { grupo: 'costas', sec: ['lombar', 'trapezio'], tipo: 'multi', itens: [
    ['MEIO TERRA (DORIAN YATES)', { equipamento: 'barra' }], ['RACK PULL', { equipamento: 'barra' }],
  ] },
  { grupo: 'costas', sec: ['biceps', 'ombro_posterior'], tipo: 'multi', itens: [
    'REMADA CURVADA SMITH', 'REMADA CURVADA BARRA SUPINADA', 'REMADA CURVADA BARRA PRONADA', 'REMADA CURVADA HALTER',
    ['REMADA HALTER BANCO INCLINADO', { estavel: true }], ['REMADA CAVALINHO', { equipamento: 'barra' }], 'REMADA CAVALINHO MÁQUINA',
    'REMADA PRONADA MÁQUINA', 'REMADA PRONADA POLIA', 'REMADA SUPINADA POLIA', ['REMADA TRIÂNGULO', { equipamento: 'polia' }],
    'REMADA MÁQUINA NEUTRA', 'REMADA SUPINADA MÁQUINA', ['REMADA ALTA HAMMER', { equipamento: 'maquina' }],
    ['REMADA BAIXA HAMMER', { equipamento: 'maquina' }], 'REMADA ALTA UNI POLIA', 'REMADA UNILATERAL POLIA', 'REMADA UNILATERAL HALTER',
    'REMADA UNILATERAL MÁQUINA NEUTRA', ['REMADA UNILATERAL MEADOWS', { equipamento: 'barra' }],
  ] },
  { grupo: 'trapezio', sec: [], tipo: 'isolado', itens: ['TRAPÉZIO BARRA', 'TRAPÉZIO HALTER'] },
  { grupo: 'ombro_lateral', sec: ['trapezio'], tipo: 'multi', itens: ['REMADA ALTA BARRA', 'REMADA ALTA SMITH', 'REMADA ALTA HALTER', 'REMADA ALTA POLIA'] },
  { grupo: 'biceps', sec: ['antebraco'], tipo: 'isolado', itens: [
    'BICEPS BANCO INCLINADO HALTER', 'BICEPS BARRA W', 'BICEPS ALTERNADO HALTER', ['BICEPS MARTELO BANCO', { equipamento: 'halter' }],
    'BICEPS MARTELO HALTER', 'BICEPS MARTELO HALTER UNI', 'BICEPS MARTELO BARRA', ['BICEPS MARTELO CORDA', { equipamento: 'polia' }],
    'BICEPS HALTER CONJUNTO', 'BICEPS POLIA BARRA', ['BICEPS UNI CONCENTRADO', { equipamento: 'halter' }], 'BICEPS SCOTT MÁQUINA',
    'BICEPS SCOTT UNILATERAL HALTER', 'BICEPS SCOTT BARRA W',
  ] },
  { grupo: 'ombro_anterior', sec: ['triceps', 'ombro_lateral'], tipo: 'multi', itens: [
    'DESENVOLVIMENTO HALTER', 'DESENVOLVIMENTO MÁQUINA HAMMER', 'DESENVOLVIMENTO MÁQUINA', 'DESENVOLVIMENTO SMITH',
    ['DESENVOLVIMENTO MILITAR', { equipamento: 'barra' }], ['DESENVOLVIMENTO ARNOLD ALTERNADO', { equipamento: 'halter' }],
    'DESENVOLVIMENTO BARRA LIVRE', ['DESENVOLVIMENTO ARNOLD', { equipamento: 'halter' }], 'DESENVOLVIMENTO NEUTRO HALTER', 'DESENVOLVIMENTO UNI HALTER',
  ] },
  { grupo: 'ombro_lateral', sec: [], tipo: 'isolado', itens: [
    'ELEVAÇÃO LATERAL HALTER', 'ELEVAÇÃO LATERAL UNI HALTER', 'ELEVAÇÃO LATERAL UNILATERAL POLIA', 'ELEVAÇÃO LATERAL MÁQUINA',
  ] },
  { grupo: 'ombro_anterior', sec: [], tipo: 'isolado', itens: [
    'FRONTAL BARRA', ['FRONTAL BANCO INCLINADO', { equipamento: 'halter' }], 'FRONTAL BANCO HALTER', 'FRONTAL UNILATERAL POLIA',
    'FRONTAL SUPINADA BARRA W', 'FRONTAL POLIA BARRA PRONADA', 'FRONTAL POLIA BARRA SUPINADA', 'FRONTAL UNILATERAL HALTER',
    'FRONTAL HALTER', 'FRONTAL ALTERNADO HALTER',
  ] },
  { grupo: 'ombro_posterior', sec: [], tipo: 'isolado', itens: [
    'VOADOR INVERTIDO MÁQUINA', 'VOADOR INVERTIDO BANCO HALTER', 'VOADOR INVERTIDO HALTER', 'VOADOR INVERTIDO POLIA',
    ['VOADOR INVERTIDO UNI BANCO', { equipamento: 'halter' }], 'VOADOR INVERTIDO UNI POLIA',
    ['FACEPULL', { equipamento: 'polia', sec: ['trapezio'] }],
  ] },
  { grupo: 'quadriceps', sec: ['gluteos', 'adutores'], tipo: 'multi', itens: [
    ['AGACHAMENTO LIVRE', { equipamento: 'barra' }], ['AGACHAMENTO BÚLGARO', { equipamento: 'halter', sec: ['gluteos'] }],
    ['LEG PRESS 45º', { equipamento: 'maquina' }], ['LEG PRESS 45º UNILATERAL', { equipamento: 'maquina' }],
    ['AGACHAMENTO FRONTAL', { equipamento: 'barra', sec: ['gluteos'] }], 'AGACHAMENTO SUMÔ SMITH', 'AGACHAMENTO SUMÔ HALTER',
    'AGACHAMENTO SMITH', ['HACK SQUAT', { equipamento: 'maquina' }], 'PASSADA BARRA', 'PASSADA HALTER', 'AFUNDO ALTERNADO HALTER',
    'AFUNDO BARRA', 'AFUNDO SMITH', ['V SQUAT', { equipamento: 'maquina' }],
  ] },
  { grupo: 'quadriceps', sec: [], tipo: 'isolado', itens: [
    ['CADEIRA EXTENSORA UNILATERAL', { equipamento: 'maquina' }], ['CADEIRA EXTENSORA', { equipamento: 'maquina' }],
  ] },
  { grupo: 'adutores', sec: [], tipo: 'isolado', itens: [['CADEIRA ADUTORA', { equipamento: 'maquina' }]] },
  { grupo: 'posterior_coxa', sec: ['gluteos', 'lombar'], tipo: 'multi', itens: [
    ['LEVANTAMENTO TERRA SUMÔ BLOCO', { sec: ['gluteos', 'adutores', 'lombar'] }], 'LEVANTAMENTO TERRA', 'LEVANTAMENTO TERRA BLOCO',
    ['LEVANTAMENTO TERRA SUMO', { sec: ['gluteos', 'adutores', 'lombar'] }], 'LEVANTAMENTO TERRA ROMENO SUMO',
    'LEVANTAMENTO TERRA ROMENO', 'LEVANTAMENTO TERRA ROMENO HALTER', ['BOM DIA', { equipamento: 'barra' }],
  ] },
  { grupo: 'posterior_coxa', sec: [], tipo: 'isolado', itens: [
    ['FLEXORA UNILATERAL VERTICAL', { equipamento: 'maquina' }], ['MESA FLEXORA', { equipamento: 'maquina' }],
    ['MESA FLEXORA UNILATERAL', { equipamento: 'maquina' }], ['CADEIRA FLEXORA', { equipamento: 'maquina' }],
  ] },
  { grupo: 'panturrilha', sec: [], tipo: 'isolado', itens: [
    ['PANTURRILHA SENTADO', { equipamento: 'maquina' }], ['PANTURRILHA LEG PRESS 45º', { equipamento: 'maquina' }],
    'PANTURRILHA EM PÉ MÁQUINA', 'PANTURRILHA MÁQUINA', 'PANTURRILHA SMITH',
  ] },
  { grupo: 'gluteos', sec: ['posterior_coxa'], tipo: 'multi', itens: [
    ['ELEVAÇÃO PÉLVICA', { equipamento: 'barra' }], ['HIPEREXTENSÃO COM PESOS', { equipamento: 'corporal', grupo: 'lombar', sec: ['gluteos', 'posterior_coxa'] }],
    ['V SQUAT INVERTIDO', { equipamento: 'maquina' }],
  ] },
  { grupo: 'gluteos', sec: [], tipo: 'isolado', itens: [
    ['CADEIRA ABDUTORA 45º', { equipamento: 'maquina' }], 'ABDUÇÃO QUADRIL POLIA', 'GLÚTEO POLIA', ['CADEIRA ABDUTORA', { equipamento: 'maquina' }],
  ] },
];

// Exercícios das fichas. "igual" = o mesmo exercício da planilha (vira um só, com o nome da ficha).
// substitutos: nomes da planilha (viram ids no seed).
export const FICHAS = [
  { nome: 'Supino reto máquina', igual: 'SUPINO RETO MÁQUINA HORIZONTAL', video: 'https://youtu.be/e-F32H5SF6E?t=2',
    obs: 'Sem a máquina sentado, fazer deitado; ou smith; em último caso, halteres.', subs: ['SUPINO RETO SMITH', 'SUPINO RETO HALTER'] },
  { nome: 'Crucifixo na polia baixa', igual: 'VOADOR POLIA BAIXA', video: 'https://www.youtube.com/shorts/7sYi5gAaD1Y', obs: 'Preferencialmente sentado no banco.' },
  { nome: 'Crucifixo polia alta', igual: 'VOADOR POLIA ALTA', video: 'https://youtu.be/_XB8ifX-aDI?t=1' },
  { nome: 'Elevação lateral máquina', igual: 'ELEVAÇÃO LATERAL MÁQUINA', video: 'https://youtu.be/xMEs3zEzS8s?t=4' },
  { nome: 'Elevação frontal banco inclinado unilateral', grupo: 'ombro_anterior', tipo: 'isolado', equipamento: 'halter',
    video: 'https://youtu.be/YWxkI-fQswE?t=3', subs: ['FRONTAL BANCO INCLINADO'] },
  { nome: 'Tríceps francês corda', igual: 'TRICEPS FRANCES CORDA', video: 'https://www.youtube.com/shorts/dMYGgTbtRIQ' },
  { nome: 'T-bar row (apoio no peito)', grupo: 'costas', sec: ['biceps', 'ombro_posterior'], tipo: 'multi', equipamento: 'maquina', estavel: true,
    apelidos: 'remada cavalinho apoio no peito tbar', video: 'https://youtu.be/BVSTYt02SuY?t=7',
    obs: 'Substituto: polia baixa pronada ou halteres com o peito apoiado.', subs: ['REMADA PRONADA POLIA', 'REMADA HALTER BANCO INCLINADO', 'REMADA CAVALINHO MÁQUINA'] },
  { nome: 'Puxada alta pronada', igual: 'PUXADA ABERTA', video: 'https://www.youtube.com/shorts/_2MfZAj98tk' },
  { nome: 'Remada baixa unilateral neutra', grupo: 'costas', sec: ['biceps', 'ombro_posterior'], tipo: 'multi', equipamento: 'polia',
    video: 'https://www.youtube.com/shorts/LpQMEygJfNY', obs: 'Cotovelo rente; não passar da linha do tronco.', subs: ['REMADA UNILATERAL POLIA', 'REMADA UNILATERAL MÁQUINA NEUTRA'] },
  { nome: 'Crucifixo inverso máquina', igual: 'VOADOR INVERTIDO MÁQUINA', video: 'https://www.youtube.com/shorts/wUT3hmnzq3c' },
  { nome: 'Rosca scott máquina', igual: 'BICEPS SCOTT MÁQUINA', video: 'https://youtu.be/Ja6ZlIDONac?t=5' },
  { nome: 'Rosca martelo sentado', igual: 'BICEPS MARTELO BANCO', video: 'https://youtu.be/wxin8wBNRi0?t=2' },
  { nome: 'Abdômen polia alta', grupo: 'abdomen', tipo: 'isolado', equipamento: 'polia', video: 'https://youtu.be/xBUocF1laq4' },
  { nome: 'Cadeira flexora', igual: 'CADEIRA FLEXORA', video: 'https://www.youtube.com/shorts/T46yKiz8laY', obs: 'Tronco inclinado para frente.' },
  { nome: 'Agachamento hack 45', igual: 'HACK SQUAT', video: 'https://youtu.be/rYgNArpwE7E?t=8',
    obs: 'Amplitude máxima. Sem o hack, smith; em último caso, livre.', subs: ['AGACHAMENTO SMITH', 'AGACHAMENTO LIVRE'] },
  { nome: 'Cadeira adutora', igual: 'CADEIRA ADUTORA', video: 'https://www.youtube.com/shorts/_uJgg6U7WbE',
    obs: 'Se zerar a máquina: tronco à frente ou unilateral.' },
  { nome: 'Elevação pélvica máquina', grupo: 'gluteos', sec: ['posterior_coxa'], tipo: 'multi', equipamento: 'maquina',
    video: 'https://youtu.be/v8hbzB4YROY?t=2', obs: 'Sem a máquina, smith; em último caso, livre.', subs: ['ELEVAÇÃO PÉLVICA'] },
  { nome: 'Cadeira extensora', igual: 'CADEIRA EXTENSORA', video: 'https://www.youtube.com/shorts/PzIfB9MiiX8' },
  { nome: 'Panturrilha em pé', igual: 'PANTURRILHA EM PÉ MÁQUINA', video: 'https://www.youtube.com/shorts/o1CyKLbUPAM',
    obs: 'Sem a máquina, smith com step.', subs: ['PANTURRILHA SMITH'] },
  { nome: 'Supino inclinado máquina', igual: 'SUPINO INCLINADO MÁQUINA', video: 'https://www.youtube.com/shorts/KK5ZSj22h7s',
    obs: 'Cotovelos rentes, foco em flexão de ombro. Sem a máquina, smith ou livre.', subs: ['SUPINO INCLINADO SMITH', 'SUPINO INCLINADO HALTER'] },
  { nome: 'Puxada alta triângulo', igual: 'PUXADA TRIÂNGULO', video: 'https://youtu.be/U3za0LZ25uA?t=2',
    obs: 'Não flexionar o ombro além de 120°; escápula fixa.' },
  { nome: 'Crucifixo máquina', igual: 'VOADOR MÁQUINA', video: 'https://www.youtube.com/shorts/MENdoLpyj7c', subs: ['PEC DECK'] },
  { nome: 'Kelso shrugs', grupo: 'trapezio', sec: ['costas'], tipo: 'isolado', equipamento: 'maquina', estavel: true,
    video: 'https://youtu.be/FWX_T0Bgrb4', obs: 'Preferencialmente no T-bar ou numa máquina com apoio no peito.' },
  { nome: 'Elevação lateral halteres', igual: 'ELEVAÇÃO LATERAL HALTER', video: 'https://www.youtube.com/shorts/ot9nwSC1JnA' },
  { nome: 'Rosca de costas para a polia (pegador V ou W)', grupo: 'biceps', tipo: 'isolado', equipamento: 'polia', video: 'https://youtu.be/rTDz9N9NUkQ' },
  { nome: 'Tríceps de costas para a polia (barra W)', grupo: 'triceps', tipo: 'isolado', equipamento: 'polia', video: 'https://youtu.be/5m1CAAKTQrU' },
  { nome: 'Stiff', grupo: 'posterior_coxa', sec: ['gluteos', 'lombar'], tipo: 'multi', equipamento: 'barra',
    video: 'https://www.youtube.com/shorts/ZoUMv0gsgI8', subs: ['LEVANTAMENTO TERRA ROMENO', 'LEVANTAMENTO TERRA ROMENO HALTER'] },
  { nome: 'Leg press 45', igual: 'LEG PRESS 45º', video: 'https://www.youtube.com/shorts/NY5fw4Zaofg', obs: 'Pés baixos na plataforma; amplitude máxima.' },
  { nome: 'Mesa flexora', igual: 'MESA FLEXORA', video: 'https://youtu.be/KAdhX6otnng?t=2' },
  { nome: 'Búlgaro no smith', grupo: 'quadriceps', sec: ['gluteos'], tipo: 'multi', equipamento: 'smith',
    video: 'https://youtu.be/eaYrlCzdy-Q?t=3', obs: 'Controlar a excêntrica; o joelho de trás quase toca o chão.', subs: ['AGACHAMENTO BÚLGARO'] },
  { nome: 'Banco solear', igual: 'PANTURRILHA SENTADO', video: 'https://www.youtube.com/shorts/91bIKBrR4Wo' },
];

// Equipamento pelo nome (a seção ou o item pode sobrescrever)
export function equipamentoDoNome(nome) {
  const n = nome.toUpperCase();
  if (n.includes('SMITH')) return 'smith';
  if (/MÁQUINA|MAQUINA|CADEIRA|MESA/.test(n)) return 'maquina';
  if (/POLIA|PUXADA|CORDA|FACEPULL/.test(n)) return 'polia';
  if (n.includes('HALTER')) return 'halter';
  if (n.includes('BARRA')) return 'barra';
  return 'barra';
}

// "SUPINO RETO MÁQUINA" → "Supino reto máquina"
const PALAVRAS = {
  triceps: 'tríceps', biceps: 'bíceps', frances: 'francês', w: 'W', inclin: 'inclinado', uni: 'unilateral',
  sumo: 'sumô', scott: 'Scott', smith: 'Smith', hammer: 'Hammer', arnold: 'Arnold', meadows: 'Meadows',
  '(dorian': '(Dorian', 'yates)': 'Yates)', facepull: 'face pull', v: 'V',
};
export function nomeBonito(nome) {
  const t = nome.toLowerCase().split(' ').map((p) => PALAVRAS[p] ?? p).join(' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const secundarios = (lista) => (lista || []).map((grupo) => ({ grupo, fracao: FRACAO_INDIRETA }));

// Lista final para inserir (sem ids). substitutos ainda como nomes da planilha.
export function montarBiblioteca() {
  const porNome = new Map();
  for (const secao of SECOES) {
    for (const item of secao.itens) {
      const [nomePlanilha, extra = {}] = Array.isArray(item) ? item : [item];
      const equipamento = extra.equipamento || equipamentoDoNome(nomePlanilha);
      porNome.set(nomePlanilha, {
        chave: nomePlanilha,
        nome: nomeBonito(nomePlanilha),
        apelidos: null,
        grupo_primario: extra.grupo || secao.grupo,
        grupos_secundarios: secundarios(extra.sec ?? secao.sec),
        tipo: secao.tipo,
        estavel: extra.estavel ?? estavelPadrao(equipamento),
        equipamento,
        incremento_kg: incrementoPadrao(equipamento),
        video_url: null,
        observacoes: null,
        substitutos: [],
      });
    }
  }
  for (const f of FICHAS) {
    const base = f.igual ? porNome.get(f.igual) : null;
    if (f.igual && !base) throw new Error(`Ficha "${f.nome}" aponta para "${f.igual}", que não existe`);
    if (base) {
      Object.assign(base, {
        apelidos: base.nome, // o nome antigo da planilha continua achando na busca
        nome: f.nome,
        video_url: f.video,
        observacoes: f.obs || null,
        substitutos: f.subs || [],
      });
    } else {
      const equipamento = f.equipamento;
      porNome.set(f.nome, {
        chave: f.nome,
        nome: f.nome,
        apelidos: f.apelidos || null,
        grupo_primario: f.grupo,
        grupos_secundarios: secundarios(f.sec),
        tipo: f.tipo,
        estavel: f.estavel ?? estavelPadrao(equipamento),
        equipamento,
        incremento_kg: incrementoPadrao(equipamento),
        video_url: f.video,
        observacoes: f.obs || null,
        substitutos: f.subs || [],
      });
    }
  }
  return [...porNome.values()];
}

export const TOTAL_PLANILHA = SECOES.reduce((n, s) => n + s.itens.length, 0);
