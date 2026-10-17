import { emBreve } from '../componentes.js';

export const titulo = 'Corpo';

export function render(el) {
  el.innerHTML = emBreve({ icone: 'corpo', titulo: 'Corpo', etapa: '6', texto: 'Peso diário, medidas quinzenais e fotos opcionais.' });
}
