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

// Foto do Google ou as iniciais do nome
export function avatar(pessoa, tamanho = 40) {
  const estilo = `width:${tamanho}px;height:${tamanho}px`;
  if (pessoa?.foto_url) return `<img class="avatar" style="${estilo}" src="${esc(pessoa.foto_url)}" alt="" referrerpolicy="no-referrer">`;
  const iniciais = String(pessoa?.nome || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return `<span class="avatar" style="${estilo};font-size:${Math.round(tamanho * 0.38)}px">${esc(iniciais)}</span>`;
}

export const ROTULO_STATUS = { pendente: 'Aguardando aprovação', ativo: 'Ativo', inativo: 'Desativado' };

// Mensagem rápida no rodapé
export function aviso(texto, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `aviso ${tipo}`;
  el.setAttribute('role', 'status');
  el.textContent = texto;
  document.body.append(el);
  setTimeout(() => el.remove(), 3000);
}
