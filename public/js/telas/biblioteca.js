import { emBreve } from '../componentes.js';

export const titulo = 'Biblioteca';
export const larga = true;
export function render(el) {
  el.innerHTML = emBreve({ icone: 'biblioteca', titulo: 'Biblioteca', etapa: '2', texto: 'Os 170 exercícios da planilha + os das fichas, com vídeo.' });
}
