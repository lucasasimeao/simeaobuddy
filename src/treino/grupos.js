// Grupos musculares usados na biblioteca e no contador de séries por músculo.
// regiao: define o padrão da escada (superiores x inferiores/abdômen), ver docs/05 regra 4.
export const GRUPOS = {
  peito: { rotulo: 'Peito', regiao: 'superior' },
  costas: { rotulo: 'Costas', regiao: 'superior' },
  trapezio: { rotulo: 'Trapézio', regiao: 'superior' },
  ombro_anterior: { rotulo: 'Ombro anterior', regiao: 'superior' },
  ombro_lateral: { rotulo: 'Ombro lateral', regiao: 'superior' },
  ombro_posterior: { rotulo: 'Ombro posterior', regiao: 'superior' },
  biceps: { rotulo: 'Bíceps', regiao: 'superior' },
  triceps: { rotulo: 'Tríceps', regiao: 'superior' },
  antebraco: { rotulo: 'Antebraço', regiao: 'superior' },
  quadriceps: { rotulo: 'Quadríceps', regiao: 'inferior' },
  posterior_coxa: { rotulo: 'Posterior de coxa', regiao: 'inferior' },
  gluteos: { rotulo: 'Glúteos', regiao: 'inferior' },
  adutores: { rotulo: 'Adutores', regiao: 'inferior' },
  panturrilha: { rotulo: 'Panturrilha', regiao: 'inferior' },
  lombar: { rotulo: 'Lombar', regiao: 'inferior' },
  abdomen: { rotulo: 'Abdômen', regiao: 'core' },
};

export const EQUIPAMENTOS = {
  barra: { rotulo: 'Barra', incremento: 2.5 },
  halter: { rotulo: 'Halter', incremento: 2 },
  maquina: { rotulo: 'Máquina', incremento: 5 },
  polia: { rotulo: 'Polia', incremento: 5 },
  smith: { rotulo: 'Smith', incremento: 2.5 },
  corporal: { rotulo: 'Peso corporal', incremento: 2.5 },
};

// Fração padrão de uma série indireta (docs/01: modelo fracionado)
export const FRACAO_INDIRETA = 0.5;

// Incremento padrão por equipamento (docs/03 item 9)
export function incrementoPadrao(equipamento) {
  return EQUIPAMENTOS[equipamento]?.incremento ?? 2.5;
}

// "Estável" = máquina, smith ou polia (o caminho do movimento é guiado)
export function estavelPadrao(equipamento) {
  return ['maquina', 'smith', 'polia'].includes(equipamento);
}

// Texto para busca: minúsculo e sem acento ("MÁQUINA" → "maquina")
export function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
