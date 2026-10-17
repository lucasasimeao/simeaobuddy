// Hoje: o treino do dia. Na Etapa 0 mostra só se o servidor e o banco estão de pé.
import { icone } from '../icones.js';
import { esc } from '../componentes.js';

export const titulo = 'Hoje';

export async function render(el) {
  el.innerHTML = `
    <section class="card">
      <span class="etiqueta" id="status"><span class="ponto"></span>Conectando…</span>
      <h2>Nenhum treino por enquanto</h2>
      <p class="sub">Quando o seu programa estiver montado, o treino do dia aparece aqui.</p>
      <button class="botao principal cheio" disabled>${icone('play')}Começar treino</button>
    </section>`;

  const status = el.querySelector('#status');
  try {
    const r = await fetch('/api/saude');
    const dados = await r.json();
    status.innerHTML = `<span class="ponto ok"></span>Servidor ok · ${esc(dados.app)}`;
  } catch {
    status.innerHTML = '<span class="ponto erro"></span>Sem conexão com o servidor';
  }
}
