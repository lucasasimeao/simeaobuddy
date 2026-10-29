// Gestão (só no celular): atalhos para as telas do treinador.
import { icone } from '../icones.js';

export const titulo = 'Gestão';

const ITENS = [
  { id: 'alunos', nome: 'Alunos', desc: 'Cadastro e anamnese' },
  { id: 'programas', nome: 'Programas', desc: 'Montar fichas e a escada' },
  { id: 'planilha', nome: 'Planilha', desc: 'Microciclos e progressão' },
  { id: 'biblioteca', nome: 'Biblioteca', desc: 'Exercícios e vídeos' },
  { id: 'backup', nome: 'Backup', desc: 'Baixar e restaurar todos os dados' },
];

export function render(el) {
  el.innerHTML = `<div class="lista">${ITENS.map((i) => `
    <a class="lista-item" href="#/${i.id}">
      ${icone(i.id)}
      <span class="texto">${i.nome}<small>${i.desc}</small></span>
      ${icone('seta')}
    </a>`).join('')}</div>`;
}
