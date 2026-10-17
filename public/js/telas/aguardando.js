// Cadastro feito pelo Google, esperando o Lucas aprovar.
import { api, sessao } from '../api.js';
import { icone } from '../icones.js';
import { esc, avatar } from '../componentes.js';
import { iniciar } from '../app.js';

export const titulo = '';

export function render(el) {
  const u = sessao.usuario;
  el.innerHTML = `
    <section class="card vazio">
      ${avatar(u, 64)}
      <h2>Oi, ${esc(u.nome.split(' ')[0])}!</h2>
      <p>Seu cadastro foi recebido. Assim que o Lucas aprovar, o seu treino aparece aqui.</p>
      <span class="etiqueta">${icone('relogio')}Aguardando aprovação</span>
      <button class="botao principal cheio" id="verificar">${icone('atualizar')}Verificar de novo</button>
      <button class="botao cheio" id="sair">${icone('sair')}Sair</button>
    </section>`;
  el.querySelector('#verificar').addEventListener('click', iniciar);
  el.querySelector('#sair').addEventListener('click', async () => {
    await api('/auth/sair', { metodo: 'POST' }).catch(() => {});
    iniciar();
  });
}
