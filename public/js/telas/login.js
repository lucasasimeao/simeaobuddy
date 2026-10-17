// Login: alunos com Google; o treinador com usuário + senha.
import { api } from '../api.js';
import { icone, logoGoogle } from '../icones.js';
import { esc } from '../componentes.js';
import { iniciar } from '../app.js';

export const titulo = '';

const ERROS = {
  'google-desligado': 'O login com Google ainda não foi configurado.',
  'google-cancelado': 'Login com Google cancelado.',
  'google-falhou': 'Não deu para entrar com o Google. Tente de novo.',
  inativo: 'Sua conta está desativada. Fale com o Lucas.',
  'precisa-https': 'Para entrar com o Google, abra o app pelo link https (o que termina em .ts.net).',
};

export async function render(el, params, busca) {
  const { google } = await api('/auth/config').catch(() => ({ google: false }));
  const erroInicial = ERROS[busca?.get('erro')] || '';

  el.innerHTML = `
    <section class="login">
      <img src="/icone.svg" alt="" width="72" height="72" class="login-logo">
      <h2 class="login-nome">SIMEAO<b>Buddy</b></h2>
      <p class="sub">Treino low volume, do jeito certo.</p>

      <p class="erro-msg" id="erro" role="alert" ${erroInicial ? '' : 'hidden'}>${esc(erroInicial)}</p>

      <a class="botao google cheio" href="/api/auth/google" ${google ? '' : 'aria-disabled="true"'}>${logoGoogle}Entrar com Google</a>
      ${google ? '' : '<p class="dica">Login com Google ainda não configurado (veja o DEPLOY.md).</p>'}

      <details class="login-admin">
        <summary>${icone('chave')}Sou o treinador</summary>
        <form id="form-admin" class="form" autocomplete="on">
          <label>Usuário<input name="usuario" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
          <label>Senha<input name="senha" type="password" autocomplete="current-password" required></label>
          <button class="botao principal cheio" type="submit">Entrar</button>
        </form>
      </details>
    </section>`;

  const erro = el.querySelector('#erro');
  const form = el.querySelector('#form-admin');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const botao = form.querySelector('button');
    botao.disabled = true;
    erro.hidden = true;
    try {
      await api('/auth/entrar', { metodo: 'POST', corpo: Object.fromEntries(new FormData(form)) });
      history.replaceState(null, '', '#/hoje');
      await iniciar();
    } catch (e) {
      erro.textContent = e.message;
      erro.hidden = false;
      botao.disabled = false;
    }
  });
}
