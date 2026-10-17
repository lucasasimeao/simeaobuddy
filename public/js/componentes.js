// Pedaços de interface reaproveitados pelas telas.
import { icone } from './icones.js';

export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Tela ainda não construída: mostra o que vem e em qual etapa.
export function emBreve({ icone: ic, titulo, texto, etapa }) {
  return `
    <section class="card vazio">
      <div class="icone-grande">${icone(ic)}</div>
      <h2>${esc(titulo)}</h2>
      <p>${esc(texto)}</p>
      <span class="etiqueta">Chega na Etapa ${esc(etapa)}</span>
    </section>`;
}
