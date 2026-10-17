// Hoje: o treino do dia (chega na Etapa 4). Para o admin, avisa quem está aguardando aprovação.
import { api, sessao, ehAdmin } from '../api.js';
import { icone } from '../icones.js';
import { esc } from '../componentes.js';

export const titulo = 'Hoje';

export async function render(el) {
  const primeiroNome = sessao.usuario.nome.split(' ')[0];
  let pendentes = 0;
  if (ehAdmin()) {
    const { alunos } = await api('/alunos');
    pendentes = alunos.filter((a) => a.status === 'pendente').length;
  }
  el.innerHTML = `
    <h2 class="saudacao">Oi, ${esc(primeiroNome)}</h2>
    ${pendentes ? `
      <a class="lista-item destaque" href="#/alunos">
        ${icone('alunos')}
        <span class="texto">${pendentes === 1 ? '1 pessoa aguardando' : `${pendentes} pessoas aguardando`} aprovação<small>Toque para liberar</small></span>
        ${icone('seta')}
      </a>` : ''}
    <section class="card">
      <h2>Nenhum treino por enquanto</h2>
      <p class="sub">Quando o seu programa estiver montado, o treino do dia aparece aqui.</p>
      <button class="botao principal cheio" disabled>${icone('play')}Começar treino</button>
    </section>`;
}
