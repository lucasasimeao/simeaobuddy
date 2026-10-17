import { emBreve } from '../componentes.js';

export const titulo = 'Perfil';

export function render(el) {
  el.innerHTML = emBreve({ icone: 'perfil', titulo: 'Perfil', etapa: '1', texto: 'Seu login com PIN, seus dados e a anamnese.' });
}
