import { emBreve } from '../componentes.js';

export const titulo = 'Evolução';

export function render(el) {
  el.innerHTML = emBreve({ icone: 'evolucao', titulo: 'Evolução', etapa: '6', texto: 'Gráficos de tonelagem, e1RM, peso e medidas.' });
}
