import { emBreve } from '../componentes.js';

export const titulo = 'Planilha';
export const larga = true;
export function render(el) {
  el.innerHTML = emBreve({ icone: 'planilha', titulo: 'Planilha', etapa: '3', texto: 'A PLANILHA AVANÇADO dentro do app, uma aba por treino.' });
}
