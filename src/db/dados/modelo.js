// Modelo pronto "Push · Pull · Lower I · Upper · Lower – Volume em escada" (docs/04 §5 + docs/03 itens 1, 2, 4, 5).
// Escadas: m = 2→3→3 WS · x = 2→3→2 WS + 1 BO (exceções do PDF) · i = 2→2→2 WS + 1 BO · f = 2→2→2 WS
//          t = 1 TOP fixo (mesa flexora, búlgaro) · mr = 1 Muscle Round fixo
import { semana } from '../../treino/escada.js';

export const NOME_MODELO = 'Push · Pull · Lower I · Upper · Lower – Volume em escada';

export const ESCADAS = {
  m: [semana({ validas: 2 }), semana({ validas: 3 }), semana({ validas: 3 })],
  x: [semana({ validas: 2 }), semana({ validas: 3 }), semana({ validas: 2, bo: 1 })],
  i: [semana({ validas: 2 }), semana({ validas: 2 }), semana({ validas: 2, bo: 1 })],
  f: [semana({ validas: 2 }), semana({ validas: 2 }), semana({ validas: 2 })],
  t: [semana({ validas: 1 }), semana({ validas: 1 }), semana({ validas: 1 })],
  mr: [semana({ mr: 1 }), semana({ mr: 1 }), semana({ mr: 1 })],
};

const P = 'principal';
const S = 'secundario';
const I = 'isolado';
const FEEDER_3A4 = [{ reps: '3–4', pct: 80, descanso: 45 }];
const FEEDER_2A90 = [{ reps: '2', pct: 90, descanso: 60 }];
const MR = { metodo: 'muscle_round', mr_blocos: 4, mr_reps: 4, mr_descanso_seg: 10, reps_min: null, reps_max: null };

// [exercício, papel, escada, extras]
export const SESSOES = [
  { codigo: 'A', nome: 'Push', itens: [
    ['Supino reto máquina', P, 'm'],
    ['Crucifixo na polia baixa', I, 'x', { feeders: FEEDER_3A4 }],
    ['Crucifixo polia alta', S, 'i', { reps_min: 8, reps_max: 10 }],
    ['Elevação lateral máquina', I, 'i', { reps_min: 7, reps_max: 9 }],
    ['Elevação frontal banco inclinado unilateral', I, 'i'],
    ['Tríceps francês corda', I, 'i', { reps_min: 7, reps_max: 9 }],
  ] },
  { codigo: 'B', nome: 'Pull', itens: [
    ['T-bar row (apoio no peito)', P, 'x'],
    ['Puxada alta pronada', S, 'm', { descanso_seg: 150 }],
    ['Remada baixa unilateral neutra', S, 'x'],
    ['Crucifixo inverso máquina', S, 'i'],
    ['Rosca scott máquina', I, 'i'],
    ['Rosca martelo sentado', I, 'i'],
    ['Abdômen polia alta', I, 'f'],
  ] },
  { codigo: 'C', nome: 'Lower I', itens: [
    ['Cadeira flexora', P, 'f'],
    ['Agachamento hack 45', P, 'f', { descanso_seg: 180 }],
    ['Cadeira adutora', S, 'f'],
    ['Elevação pélvica máquina', S, 'f', { descanso_seg: 180 }],
    ['Cadeira extensora', S, 'f'],
    ['Panturrilha em pé', S, 'f'],
  ] },
  { codigo: 'D', nome: 'Upper', itens: [
    ['Supino inclinado máquina', P, 'm'],
    ['Puxada alta triângulo', S, 'm'],
    ['Crucifixo máquina', S, 'x'],
    ['Kelso shrugs', S, 'i'],
    ['Elevação lateral halteres', S, 'mr', MR],
    ['Rosca de costas para a polia (pegador V ou W)', I, 'mr', { ...MR, feeders: FEEDER_2A90 }],
    ['Tríceps de costas para a polia (barra W)', I, 'mr', { ...MR, feeders: FEEDER_2A90 }],
  ] },
  { codigo: 'E', nome: 'Lower', itens: [
    ['Stiff', P, 'f', { descanso_seg: 180 }],
    ['Leg press 45', S, 'f', { descanso_seg: 180 }],
    ['Mesa flexora', S, 't'],
    ['Búlgaro no smith', I, 't', { descanso_seg: 180 }],
    ['Cadeira extensora', I, 'f'],
    ['Banco solear', I, 'f'],
  ] },
];
