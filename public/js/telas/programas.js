import { emBreve } from '../componentes.js';

export const titulo = 'Programas';
export const larga = true;
export function render(el) {
  el.innerHTML = emBreve({ icone: 'programas', titulo: 'Programas', etapa: '3', texto: 'Montar o programa a partir do modelo "Volume em escada".' });
}
