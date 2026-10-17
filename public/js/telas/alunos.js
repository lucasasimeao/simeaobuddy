import { emBreve } from '../componentes.js';

export const titulo = 'Alunos';
export const larga = true;
export function render(el) {
  el.innerHTML = emBreve({ icone: 'alunos', titulo: 'Alunos', etapa: '1', texto: 'Cadastro dos alunos e a anamnese de cada um.' });
}
